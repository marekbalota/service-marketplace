import { betterAuth } from 'better-auth'
import { ErrorCodes } from '@marketplace/shared'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware, APIError, getSessionFromCtx } from 'better-auth/api'
import { eq } from 'drizzle-orm'
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
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        const confirmUrl = new URL(url)
        confirmUrl.searchParams.set(
          'callbackURL',
          `${env.frontendUrl}/change-email-pending?email=${encodeURIComponent(newEmail)}`,
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
    sendResetPassword: async ({ user, url, token }) => {
      const resetUrl = new URL(url)
      resetUrl.searchParams.set('callbackURL', `${env.frontendUrl}/reset-password`)
      if (env.nodeEnv === 'test') {
        resetTokenStore.set(user.email, token)
      }
      void sendPasswordResetEmail({ email: user.email, url: resetUrl.toString() })
    },
    onExistingUserSignUp: async ({ user }) => {
      if (env.nodeEnv === 'test') {
        existingSignupNotifiedEmails.add(user.email)
      }
      void sendExistingAccountSignUpEmail({
        email: user.email,
        loginUrl: `${env.frontendUrl}/login`,
        resetUrl: `${env.frontendUrl}/forgot-password?email=${encodeURIComponent(user.email)}`,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      const verifyUrl = new URL(url)
      verifyUrl.searchParams.set('callbackURL', `${env.frontendUrl}/verify-email/callback`)
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
            await AuthService.clearUserSessions(user.id)

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

      if (ctx.path.startsWith('/two-factor/')) {
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

  static async clearUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId))
  }
}
