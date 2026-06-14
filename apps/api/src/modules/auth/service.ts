import { betterAuth } from 'better-auth'
import { ErrorCodes } from '@marketplace/shared'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware, APIError, getSessionFromCtx } from 'better-auth/api'
import { and, asc, eq, gt, isNull } from 'drizzle-orm'
import { db } from '../../db'
import * as schema from '../../db/schema'
import { users, roles, userProfiles, sessions } from '../../db/schema'
import type { AuthModel } from './model'
import { AuthErrorMessages } from '../../lib/errors'
import { captcha } from 'better-auth/plugins'
import { impersonationPlugin } from './impersonation-plugin'
import { twoFactorPlugin } from './two-factor-plugin'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendExistingAccountSignUpEmail,
  sendChangeEmailConfirmationEmail,
  sendNewEmailVerificationEmail,
} from '../../lib/email'
import { redis } from '../../lib/redis'
import { env } from '../../lib/env'
import { resolveLocale } from '../../lib/resolveLocale'
import { lookup as geoLookup } from 'geoip-lite'

export const verificationTokenStore = new Map<string, string>()
export const resetTokenStore = new Map<string, string>()
export const existingSignupNotifiedEmails = new Set<string>()

export const auth = betterAuth({
  baseURL: env.betterAuthUrl,
  trustedOrigins: [env.frontendUrl],
  plugins: [
    impersonationPlugin(),
    twoFactorPlugin({ issuer: 'Marketplace' }),
    captcha({ provider: 'cloudflare-turnstile', secretKey: env.turnstile.secretKey }),
  ],
  disabledPaths: [
    '/list-sessions',
    '/revoke-session',
    '/revoke-other-sessions',
    '/revoke-sessions',
    '/sign-in/social',
    '/verify-password',
    '/update-user',
    '/delete-user',
    '/delete-user/callback',
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.oauthAccounts,
      verification: schema.verifications,
    },
  }),
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }, request) => {
        const locale = resolveLocale(request?.headers.get('accept-language'))
        const confirmUrl = new URL(url)
        confirmUrl.searchParams.set(
          'callbackURL',
          `${env.frontendUrl}/${locale}/change-email-pending?email=${encodeURIComponent(newEmail)}`,
        )
        void sendChangeEmailConfirmationEmail({ email: user.email, url: confirmUrl.toString() })
      },
    },
    additionalFields: {
      roleId: { type: 'string', input: false },
      isBanned: { type: 'boolean', input: false },
      banReason: { type: 'string', input: false },
      banExpiration: { type: 'date', input: false },
      twoFactorEnabled: { type: 'boolean', input: false, defaultValue: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      const locale = resolveLocale(request?.headers.get('accept-language'))
      const resetUrl = new URL(url)
      resetUrl.searchParams.set('callbackURL', `${env.frontendUrl}/${locale}/reset-password`)
      if (env.nodeEnv === 'test') {
        resetTokenStore.set(user.email, token)
      }
      void sendPasswordResetEmail({ email: user.email, url: resetUrl.toString() })
    },
    onExistingUserSignUp: async ({ user }, request) => {
      const locale = resolveLocale(request?.headers.get('accept-language'))
      if (env.nodeEnv === 'test') {
        existingSignupNotifiedEmails.add(user.email)
      }
      void sendExistingAccountSignUpEmail({
        email: user.email,
        loginUrl: `${env.frontendUrl}/${locale}/login`,
        resetUrl: `${env.frontendUrl}/${locale}/forgot-password?email=${encodeURIComponent(user.email)}`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const locale = resolveLocale(request?.headers.get('accept-language'))
      const verifyUrl = new URL(url)
      verifyUrl.searchParams.set('callbackURL', `${env.frontendUrl}/${locale}/verify-email/callback`)
      if (env.nodeEnv === 'test') {
        verificationTokenStore.set(user.email, token)
      }
      const storedUser = await db.query.users.findFirst({ where: eq(users.id, user.id) })
      const isEmailChange = storedUser?.email !== user.email
      if (isEmailChange) {
        void sendNewEmailVerificationEmail({ email: user.email, url: verifyUrl.toString() })
      } else {
        void sendVerificationEmail({ email: user.email, url: verifyUrl.toString() })
      }
    },
  },
  secondaryStorage: {
    get: async (key) => {
      try {
        return await redis.get(key)
      } catch {
        return null
      }
    },
    set: async (key, value, ttl) => {
      try {
        if (ttl) await redis.set(key, value, 'EX', ttl)
        else await redis.set(key, value)
      } catch {
        // degrade gracefully
      }
    },
    delete: async (key) => {
      try {
        await redis.del(key)
      } catch {
        // degrade gracefully
      }
    },
  },
  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24,
    rememberMeExpiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 12,
    additionalFields: {
      location: { type: 'string', input: false },
    },
  },
  rateLimit: {
    enabled: env.nodeEnv === 'production',
    storage: 'secondary-storage',
    customRules: {
      '/sign-in/email': {
        window: 300,
        max: 5,
      },
      '/request-password-reset': {
        window: 3600,
        max: 5,
      },
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          if (session.ipAddress) {
            const geo = geoLookup(session.ipAddress)
            const location = geo ? [geo.city, geo.country].filter(Boolean).join(', ') : null
            if (location) {
              await db.update(sessions).set({ location }).where(eq(sessions.id, session.id))
            }
          }

          const SESSION_CAP = 10
          const active = await db.query.sessions.findMany({
            where: and(
              eq(sessions.userId, session.userId),
              isNull(sessions.impersonatedBy),
              gt(sessions.expiresAt, new Date()),
            ),
            orderBy: asc(sessions.createdAt),
            columns: { id: true, token: true },
          })
          const excess = active.slice(0, Math.max(0, active.length - SESSION_CAP))
          if (excess.length > 0) {
            const { internalAdapter } = await auth.$context
            for (const old of excess) {
              await internalAdapter.deleteSession(old.token)
            }
          }
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          const role = await db.query.roles.findFirst({
            where: eq(roles.isDefault, true),
          })

          if (role) {
            await db.update(users).set({ roleId: role.roleId }).where(eq(users.id, user.id))
          }
          await db.insert(userProfiles).values({
            accountId: user.id,
            name: user.name,
            email: user.email,
          })
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (env.nodeEnv !== 'test' && ctx.path === '/sign-in/email') {
        const user = await db.query.users.findFirst({
          where: eq(users.email, ctx.body.email),
        })

        if (user) {
          const banStatus = await AuthService.checkBanStatus(user.id)
          if (banStatus) {
            await ctx.context.internalAdapter.deleteSessions(user.id)

            return new APIError('FORBIDDEN', {
              code: ErrorCodes.Banned,
              message: AuthErrorMessages.banned,
              reason: banStatus.reason,
              expiresAt: banStatus.expiresAt,
            })
          }
        }
      }

      // Block changeEmail and changePassword during impersonation
      if (['/change-email', '/change-password'].includes(ctx.path)) {
        const session = await getSessionFromCtx(ctx)
        if (session?.session.impersonatedBy) {
          return new APIError('FORBIDDEN', {
            code: ErrorCodes.ImpersonationReadOnly,
            message: AuthErrorMessages.impersonationReadOnly,
          })
        }
      }

      if (ctx.path.startsWith('/two-factor/') && ctx.path !== '/two-factor/status') {
        const session = await getSessionFromCtx(ctx)
        if (session?.session.impersonatedBy) {
          return new APIError('FORBIDDEN', {
            code: ErrorCodes.ImpersonationReadOnly,
            message: AuthErrorMessages.impersonationReadOnly,
          })
        }
      }
    }),
  },
})

export abstract class AuthService {
  static async checkBanStatus(userId: string): Promise<AuthModel['banCheckResult'] | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user?.isBanned) {
      return null
    }

    const now = new Date()
    const isExpired = user.banExpiration && user.banExpiration < now

    if (isExpired) {
      await db
        .update(users)
        .set({ isBanned: false, banReason: null, banExpiration: null })
        .where(eq(users.id, userId))

      return null
    }

    return {
      isBanned: true,
      reason: user.banReason,
      expiresAt: user.banExpiration,
    }
  }
}
