import type { BetterAuthPlugin } from 'better-auth'
import {
  createAuthMiddleware,
  createAuthEndpoint,
  getSessionFromCtx,
  APIError,
} from 'better-auth/api'
import { deleteSessionCookie, setSessionCookie, expireCookie } from 'better-auth/cookies'
import {
  symmetricEncrypt,
  symmetricDecrypt,
  generateRandomString,
  constantTimeEqual,
  type SecretConfig,
} from 'better-auth/crypto'
import { createHMAC } from '@better-auth/utils/hmac'
import { createOTP } from '@better-auth/utils/otp'
import * as z from 'zod'
import { db } from '../../db'
import {
  users,
  userTwoFactorMethods,
  userTotpCredentials,
  userBackupCodes,
  verifications,
} from '../../db/schema'
import { eq, and, isNull, like } from 'drizzle-orm'
import { env } from '../../lib/env'
import { sendTwoFactorOtpEmail, sendSecurityAlertEmail } from '../../lib/email'

// ─── Test-mode stores ────────────────────────────────────────────────────────
export const twoFactorOtpStore = new Map<string, string>() // email → plainOtp

// ─── Shared types ─────────────────────────────────────────────────────────────

type Ctx = Parameters<typeof setSessionCookie>[0]
type TwoFactorCookie = Parameters<typeof expireCookie>[1]

const TRUST_DEVICE_MAX_AGE_SECS = 30 * 24 * 60 * 60

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function resolvePendingCookie(ctx: Ctx) {
  const twoFactorCookie = ctx.context.createAuthCookie('two_factor')
  const identifier = await ctx.getSignedCookie(twoFactorCookie.name, ctx.context.secret)
  if (!identifier) {
    throw new APIError('UNAUTHORIZED', {
      message: 'Invalid two factor cookie',
      code: 'INVALID_TWO_FACTOR_COOKIE',
    })
  }
  const verification = await ctx.context.internalAdapter.findVerificationValue(identifier)
  if (!verification) {
    throw new APIError('UNAUTHORIZED', {
      message: 'Invalid two factor cookie',
      code: 'INVALID_TWO_FACTOR_COOKIE',
    })
  }
  return { identifier, userId: verification.value as string, twoFactorCookie }
}

async function completeSignIn(ctx: Ctx, userId: string, identifier: string, twoFactorCookie: TwoFactorCookie) {
  await ctx.context.internalAdapter.deleteVerificationByIdentifier(identifier)
  expireCookie(ctx, twoFactorCookie)
  const dontRememberMe = await ctx.getSignedCookie(
    ctx.context.authCookies.dontRememberToken.name,
    ctx.context.secret,
  )
  const user = await ctx.context.internalAdapter.findUserById(userId)
  if (!user) {
    throw new APIError('INTERNAL_SERVER_ERROR', { message: 'User not found' })
  }
  const session = await ctx.context.internalAdapter.createSession(userId, !!dontRememberMe)
  await setSessionCookie(ctx, { session, user })
  expireCookie(ctx, ctx.context.authCookies.dontRememberToken)
  return { session, user }
}

async function setTrustDevice(ctx: Ctx, userId: string) {
  const maxAge = TRUST_DEVICE_MAX_AGE_SECS
  const trustIdentifier = `trust-device-${generateRandomString(32)}`
  const hmacToken = await createHMAC('SHA-256', 'base64urlnopad').sign(
    ctx.context.secret,
    `${userId}!${trustIdentifier}`,
  )
  await ctx.context.internalAdapter.createVerificationValue({
    identifier: trustIdentifier,
    value: userId,
    expiresAt: new Date(Date.now() + maxAge * 1000),
  })
  const trustCookie = ctx.context.createAuthCookie('trust_device', { maxAge })
  await ctx.setSignedCookie(
    trustCookie.name,
    `${hmacToken}!${trustIdentifier}`,
    ctx.context.secret,
    trustCookie.attributes,
  )
}

function generateBackupCode(): string {
  const part = () => generateRandomString(5, 'A-Z', '0-9')
  return `${part()}-${part()}`
}

async function insertFreshBackupCodes(userId: string, secretConfig: string | SecretConfig) {
  const plain = Array.from({ length: 10 }, generateBackupCode)
  const rows = await Promise.all(
    plain.map(async (code, i) => ({
      userId,
      codeIndex: i + 1,
      codeEncrypted: await symmetricEncrypt({ key: secretConfig, data: code }),
      usedAt: null,
    })),
  )
  await db.transaction(async (tx) => {
    await tx.delete(userBackupCodes).where(eq(userBackupCodes.userId, userId))
    await tx.insert(userBackupCodes).values(rows)
  })
  return plain
}

async function refreshSession(ctx: Ctx, userId: string, oldToken: string) {
  const session = await ctx.context.internalAdapter.createSession(userId, false)
  const user = await ctx.context.internalAdapter.findUserById(userId)
  if (!user) {
    throw new APIError('INTERNAL_SERVER_ERROR', { message: 'User not found' })
  }
  await setSessionCookie(ctx, { session, user })
  await ctx.context.internalAdapter.deleteSession(oldToken)
  return { session, user }
}

// ─── Plugin export ─────────────────────────────────────────────────────────────

interface TwoFactorPluginOptions {
  issuer: string
  /** How long (seconds) the pending 2FA state lasts after sign-in. Default: 600 */
  challengeWindowSeconds?: number
  totp?: {
    digits?: number
    period?: number
  }
  otp?: {
    digits?: number
    /** How long (seconds) the emailed OTP is valid during a challenge. Default: 180 */
    challengeTtlSeconds?: number
    /** How long (seconds) setup/enable OTPs are valid. Default: 600 */
    setupTtlSeconds?: number
    maxAttempts?: number
  }
}

export function twoFactorPlugin(options: TwoFactorPluginOptions): BetterAuthPlugin {
  const totpDigits = options.totp?.digits ?? 6
  const totpPeriod = options.totp?.period ?? 30
  const otpDigits = options.otp?.digits ?? 6
  const challengeWindowMs = (options.challengeWindowSeconds ?? 600) * 1000
  const challengeWindowSecs = options.challengeWindowSeconds ?? 600
  const challengeTtlMs = (options.otp?.challengeTtlSeconds ?? 180) * 1000
  const setupTtlMs = (options.otp?.setupTtlSeconds ?? 600) * 1000
  const maxAttempts = options.otp?.maxAttempts ?? 5

  const twoFactorAfterHook = createAuthMiddleware(async (ctx) => {
    const newSession = ctx.context.newSession
    if (!newSession?.user.twoFactorEnabled) return

    // Trust device check
    const trustDeviceCookieAttrs = ctx.context.createAuthCookie('trust_device', {
      maxAge: 30 * 24 * 60 * 60,
    })
    const trustDeviceCookieValue = await ctx.getSignedCookie(
      trustDeviceCookieAttrs.name,
      ctx.context.secret,
    )
    if (trustDeviceCookieValue) {
      const [hmacToken, trustIdentifier] = trustDeviceCookieValue.split('!') as [string, string]
      if (hmacToken && trustIdentifier) {
        const expectedHmac = await createHMAC('SHA-256', 'base64urlnopad').sign(
          ctx.context.secret,
          `${newSession.user.id}!${trustIdentifier}`,
        )
        const entry = await ctx.context.internalAdapter.findVerificationValue(trustIdentifier)
        if (
          entry &&
          entry.value === newSession.user.id &&
          entry.expiresAt.getTime() > Date.now() &&
          constantTimeEqual(hmacToken, expectedHmac)
        ) {
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(trustIdentifier)
          await setTrustDevice(ctx, newSession.user.id)
          return
        }
        expireCookie(ctx, trustDeviceCookieAttrs)
      }
    }

    const methods = await db
      .select({ method: userTwoFactorMethods.method })
      .from(userTwoFactorMethods)
      .where(eq(userTwoFactorMethods.userId, newSession.user.id))
    const twoFactorMethods = methods.map((m) => m.method)

    deleteSessionCookie(ctx, true)
    await ctx.context.internalAdapter.deleteSession(newSession.session.token)

    const identifier = `2fa-${generateRandomString(20)}`
    await ctx.context.internalAdapter.createVerificationValue({
      identifier,
      value: newSession.user.id,
      expiresAt: new Date(Date.now() + challengeWindowMs),
    })
    const twoFactorCookie = ctx.context.createAuthCookie('two_factor', {
      maxAge: challengeWindowSecs,
    })
    await ctx.setSignedCookie(
      twoFactorCookie.name,
      identifier,
      ctx.context.secret,
      twoFactorCookie.attributes,
    )

    return ctx.json({ twoFactorRedirect: true, twoFactorMethods })
  })

  return {
    id: 'custom-two-factor',
    hooks: {
      after: [
        {
          matcher(context) {
            return (
              context.path === '/sign-in/email' ||
              context.path === '/sign-in/username'
            )
          },
          handler: twoFactorAfterHook,
        },
      ],
    },
    endpoints: {
      sendEmailOtp: createAuthEndpoint(
        '/two-factor/send-email-otp',
        { method: 'POST', requireHeaders: true },
        async (ctx) => {
          const {
            identifier,
            userId,
            twoFactorCookie: _twoFactorCookie,
          } = await resolvePendingCookie(ctx)
          const user = await ctx.context.internalAdapter.findUserById(userId)
          if (!user) throw new APIError('INTERNAL_SERVER_ERROR', { message: 'User not found' })
          const method = await db.query.userTwoFactorMethods.findFirst({
            where: and(
              eq(userTwoFactorMethods.userId, userId),
              eq(userTwoFactorMethods.method, 'email'),
            ),
          })
          if (!method) {
            throw new APIError('BAD_REQUEST', {
              message: 'Email OTP method not enabled',
              code: 'EMAIL_OTP_NOT_ENABLED',
            })
          }
          const otp = generateRandomString(otpDigits, '0-9')
          const encryptedOtp = await symmetricEncrypt({ key: ctx.context.secretConfig, data: otp })
          const otpKey = `2fa-otp-${identifier}`
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(otpKey)
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: otpKey,
            value: `${encryptedOtp}:0`,
            expiresAt: new Date(Date.now() + challengeTtlMs),
          })
          if (env.nodeEnv === 'test') {
            twoFactorOtpStore.set(user.email, otp)
          }
          sendTwoFactorOtpEmail({ email: user.email, otp }).catch((err) =>
            console.error('[2fa] Failed to send OTP email', err),
          )
          return ctx.json({ status: true })
        },
      ),

      verifyEmailOtp: createAuthEndpoint(
        '/two-factor/verify-email-otp',
        {
          method: 'POST',
          body: z.object({ code: z.string().min(1).max(8), trustDevice: z.boolean().optional() }),
          requireHeaders: true,
        },
        async (ctx) => {
          const { identifier, userId, twoFactorCookie } = await resolvePendingCookie(ctx)
          const method = await db.query.userTwoFactorMethods.findFirst({
            where: and(
              eq(userTwoFactorMethods.userId, userId),
              eq(userTwoFactorMethods.method, 'email'),
            ),
          })
          if (!method) {
            throw new APIError('BAD_REQUEST', {
              message: 'Email OTP method not enabled',
              code: 'EMAIL_OTP_NOT_ENABLED',
            })
          }
          const otpKey = `2fa-otp-${identifier}`
          const otpVerification = await ctx.context.internalAdapter.findVerificationValue(otpKey)
          if (!otpVerification) {
            throw new APIError('UNAUTHORIZED', {
              message: 'OTP not found or expired',
              code: 'OTP_NOT_FOUND',
            })
          }
          const [encryptedOtp, counterStr] = otpVerification.value.split(':') as [string, string]
          const counter = parseInt(counterStr ?? '0', 10)
          if (counter >= maxAttempts) {
            await ctx.context.internalAdapter.deleteVerificationByIdentifier(otpKey)
            throw new APIError('UNAUTHORIZED', {
              message: 'Too many attempts',
              code: 'TOO_MANY_ATTEMPTS',
            })
          }
          const plain = await symmetricDecrypt({
            key: ctx.context.secretConfig,
            data: encryptedOtp,
          })
          if (!constantTimeEqual(plain, ctx.body.code)) {
            await db
              .update(verifications)
              .set({ value: `${encryptedOtp}:${counter + 1}` })
              .where(
                and(
                  eq(verifications.identifier, otpKey),
                  eq(verifications.value, `${encryptedOtp}:${counter}`),
                ),
              )
            throw new APIError('UNAUTHORIZED', { message: 'Invalid code', code: 'INVALID_CODE' })
          }
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(otpKey)
          const { session, user } = await completeSignIn(ctx, userId, identifier, twoFactorCookie)
          if (ctx.body.trustDevice) {
            await setTrustDevice(ctx, userId)
          }
          return ctx.json({ token: session.token, user })
        },
      ),

      setupEmail: createAuthEndpoint(
        '/two-factor/setup-email',
        { method: 'POST', body: z.object({ password: z.string() }), requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user } = sessionData
          await ctx.context.password.checkPassword(user.id, ctx)
          const otp = generateRandomString(otpDigits, '0-9')
          const encryptedOtp = await symmetricEncrypt({ key: ctx.context.secretConfig, data: otp })
          const otpKey = `enable-email-${user.id}`
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(otpKey)
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: otpKey,
            value: `${encryptedOtp}:0`,
            expiresAt: new Date(Date.now() + setupTtlMs),
          })
          if (env.nodeEnv === 'test') {
            twoFactorOtpStore.set(user.email, otp)
          }
          sendTwoFactorOtpEmail({ email: user.email, otp }).catch((err) =>
            console.error('[2fa] Failed to send setup OTP email', err),
          )
          return ctx.json({ status: true })
        },
      ),

      enableEmail: createAuthEndpoint(
        '/two-factor/enable-email',
        { method: 'POST', body: z.object({ code: z.string().min(1).max(8) }), requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user, session } = sessionData
          const otpKey = `enable-email-${user.id}`
          const otpVerification = await ctx.context.internalAdapter.findVerificationValue(otpKey)
          if (!otpVerification) {
            throw new APIError('UNAUTHORIZED', {
              message: 'OTP not found or expired',
              code: 'OTP_NOT_FOUND',
            })
          }
          const [encryptedOtp, counterStr] = otpVerification.value.split(':') as [string, string]
          const counter = parseInt(counterStr ?? '0', 10)
          if (counter >= maxAttempts) {
            await ctx.context.internalAdapter.deleteVerificationByIdentifier(otpKey)
            throw new APIError('UNAUTHORIZED', {
              message: 'Too many attempts',
              code: 'TOO_MANY_ATTEMPTS',
            })
          }
          const plain = await symmetricDecrypt({
            key: ctx.context.secretConfig,
            data: encryptedOtp,
          })
          if (!constantTimeEqual(plain, ctx.body.code)) {
            await db
              .update(verifications)
              .set({ value: `${encryptedOtp}:${counter + 1}` })
              .where(
                and(
                  eq(verifications.identifier, otpKey),
                  eq(verifications.value, `${encryptedOtp}:${counter}`),
                ),
              )
            throw new APIError('UNAUTHORIZED', { message: 'Invalid code', code: 'INVALID_CODE' })
          }
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(otpKey)
          await db.transaction(async (tx) => {
            await tx
              .insert(userTwoFactorMethods)
              .values({ userId: user.id, method: 'email', enabledAt: new Date() })
              .onConflictDoNothing()
            await tx.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, user.id))
          })
          let backupCodes: string[] = []
          const existingCodes = await db.query.userBackupCodes.findFirst({
            where: eq(userBackupCodes.userId, user.id),
          })
          if (!existingCodes) {
            backupCodes = await insertFreshBackupCodes(user.id, ctx.context.secretConfig)
          }
          await refreshSession(ctx, user.id, session.token)
          sendSecurityAlertEmail({
            email: user.email,
            subject: 'Two-factor authentication enabled',
            message: 'Email OTP two-factor authentication has been enabled on your account.',
          }).catch((err) => console.error('[2fa] Failed to send security alert email', err))
          return ctx.json({ backupCodes })
        },
      ),

      disableEmail: createAuthEndpoint(
        '/two-factor/disable-email',
        { method: 'POST', body: z.object({ password: z.string() }), requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user, session } = sessionData
          await ctx.context.password.checkPassword(user.id, ctx)
          let emailWasLastMethod = false
          await db.transaction(async (tx) => {
            await tx
              .delete(userTwoFactorMethods)
              .where(
                and(
                  eq(userTwoFactorMethods.userId, user.id),
                  eq(userTwoFactorMethods.method, 'email'),
                ),
              )
            const remainingMethods = await tx
              .select({ method: userTwoFactorMethods.method })
              .from(userTwoFactorMethods)
              .where(eq(userTwoFactorMethods.userId, user.id))
            if (remainingMethods.length === 0) {
              emailWasLastMethod = true
              await tx.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, user.id))
              await tx.delete(userBackupCodes).where(eq(userBackupCodes.userId, user.id))
              await tx
                .delete(verifications)
                .where(
                  and(
                    eq(verifications.value, user.id),
                    like(verifications.identifier, 'trust-device-%'),
                  ),
                )
            }
          })
          if (emailWasLastMethod) {
            const trustCookie = ctx.context.createAuthCookie('trust_device', { maxAge: TRUST_DEVICE_MAX_AGE_SECS })
            const trustValue = await ctx.getSignedCookie(trustCookie.name, ctx.context.secret)
            if (trustValue) {
              expireCookie(ctx, trustCookie)
            }
          }
          await refreshSession(ctx, user.id, session.token)
          sendSecurityAlertEmail({
            email: user.email,
            subject: 'Two-factor authentication disabled',
            message: 'Email OTP two-factor authentication has been disabled on your account.',
          }).catch((err) => console.error('[2fa] Failed to send security alert email', err))
          return ctx.json({ status: true })
        },
      ),

      setupTotp: createAuthEndpoint(
        '/two-factor/setup-totp',
        { method: 'POST', body: z.object({ password: z.string() }), requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user } = sessionData
          await ctx.context.password.checkPassword(user.id, ctx)
          const secret = generateRandomString(32)
          const encryptedSecret = await symmetricEncrypt({
            key: ctx.context.secretConfig,
            data: secret,
          })
          const setupKey = `totp-setup-${user.id}`
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(setupKey)
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: setupKey,
            value: encryptedSecret,
            expiresAt: new Date(Date.now() + setupTtlMs),
          })
          const uri = createOTP(secret, { digits: totpDigits, period: totpPeriod }).url(
            options.issuer,
            user.email,
          )
          return ctx.json({ uri })
        },
      ),

      enableTotp: createAuthEndpoint(
        '/two-factor/enable-totp',
        { method: 'POST', body: z.object({ code: z.string().min(1).max(8) }), requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user, session } = sessionData
          const setupKey = `totp-setup-${user.id}`
          const stored = await ctx.context.internalAdapter.findVerificationValue(setupKey)
          if (!stored) {
            throw new APIError('UNAUTHORIZED', {
              message: 'TOTP setup expired',
              code: 'TOTP_SETUP_EXPIRED',
            })
          }
          const secret = await symmetricDecrypt({
            key: ctx.context.secretConfig,
            data: stored.value,
          })
          const valid = await createOTP(secret, { digits: totpDigits, period: totpPeriod }).verify(
            ctx.body.code,
          )
          if (!valid) {
            throw new APIError('UNAUTHORIZED', { message: 'Invalid code', code: 'INVALID_CODE' })
          }
          // Replay prevention for the enable flow (separate namespace from challenge replay)
          const validatedStep = Math.floor(Date.now() / 1000 / 30)
          const enableReplayKey = `totp-enable-replay-${user.id}`
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(enableReplayKey)
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: enableReplayKey,
            value: String(validatedStep),
            expiresAt: new Date(Date.now() + 90 * 1000),
          })
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(setupKey)
          let codes: string[] = []
          await db.transaction(async (tx) => {
            const [method] = await tx
              .insert(userTwoFactorMethods)
              .values({ userId: user.id, method: 'totp', enabledAt: new Date() })
              .returning()
            await tx
              .insert(userTotpCredentials)
              .values({ methodId: method!.id, secret: stored.value })
            await tx.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, user.id))
          })
          const existingCodes = await db.query.userBackupCodes.findFirst({
            where: eq(userBackupCodes.userId, user.id),
          })
          if (!existingCodes) {
            codes = await insertFreshBackupCodes(user.id, ctx.context.secretConfig)
          }
          await refreshSession(ctx, user.id, session.token)
          sendSecurityAlertEmail({
            email: user.email,
            subject: 'Two-factor authentication enabled',
            message: 'TOTP two-factor authentication has been enabled on your account.',
          }).catch((err) => console.error('[2fa] Failed to send security alert email', err))
          return ctx.json({ backupCodes: codes })
        },
      ),

      verifyTotp: createAuthEndpoint(
        '/two-factor/verify-totp',
        {
          method: 'POST',
          body: z.object({ code: z.string().min(1).max(8), trustDevice: z.boolean().optional() }),
          requireHeaders: true,
        },
        async (ctx) => {
          const { identifier, userId, twoFactorCookie } = await resolvePendingCookie(ctx)
          const totpMethod = await db.query.userTwoFactorMethods.findFirst({
            where: and(
              eq(userTwoFactorMethods.userId, userId),
              eq(userTwoFactorMethods.method, 'totp'),
            ),
          })
          if (!totpMethod) {
            throw new APIError('BAD_REQUEST', {
              message: 'TOTP method not enabled',
              code: 'TOTP_NOT_ENABLED',
            })
          }
          const credential = await db.query.userTotpCredentials.findFirst({
            where: eq(userTotpCredentials.methodId, totpMethod.id),
          })
          if (!credential) {
            throw new APIError('INTERNAL_SERVER_ERROR', { message: 'TOTP credential not found' })
          }
          const secret = await symmetricDecrypt({
            key: ctx.context.secretConfig,
            data: credential.secret,
          })
          const valid = await createOTP(secret, { digits: totpDigits, period: totpPeriod }).verify(
            ctx.body.code,
          )
          if (!valid) {
            throw new APIError('UNAUTHORIZED', { message: 'Invalid code', code: 'INVALID_CODE' })
          }
          // Replay prevention
          const validatedStep = Math.floor(Date.now() / 1000 / 30)
          const replayKey = `totp-replay-${userId}`
          const replayEntry = await ctx.context.internalAdapter.findVerificationValue(replayKey)
          if (replayEntry && parseInt(replayEntry.value) >= validatedStep) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Code already used',
              code: 'CODE_ALREADY_USED',
            })
          }
          await ctx.context.internalAdapter.deleteVerificationByIdentifier(replayKey)
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: replayKey,
            value: String(validatedStep),
            expiresAt: new Date(Date.now() + 90 * 1000),
          })
          const { session, user } = await completeSignIn(ctx, userId, identifier, twoFactorCookie)
          if (ctx.body.trustDevice) {
            await setTrustDevice(ctx, userId)
          }
          return ctx.json({ token: session.token, user })
        },
      ),

      disableTotp: createAuthEndpoint(
        '/two-factor/disable-totp',
        { method: 'POST', body: z.object({ password: z.string() }), requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user, session } = sessionData
          await ctx.context.password.checkPassword(user.id, ctx)
          let totpWasLastMethod = false
          await db.transaction(async (tx) => {
            await tx
              .delete(userTwoFactorMethods)
              .where(
                and(
                  eq(userTwoFactorMethods.userId, user.id),
                  eq(userTwoFactorMethods.method, 'totp'),
                ),
              )
            const remainingMethods = await tx
              .select({ method: userTwoFactorMethods.method })
              .from(userTwoFactorMethods)
              .where(eq(userTwoFactorMethods.userId, user.id))
            if (remainingMethods.length === 0) {
              totpWasLastMethod = true
              await tx.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, user.id))
              await tx.delete(userBackupCodes).where(eq(userBackupCodes.userId, user.id))
              await tx
                .delete(verifications)
                .where(
                  and(
                    eq(verifications.value, user.id),
                    like(verifications.identifier, 'trust-device-%'),
                  ),
                )
            }
          })
          if (totpWasLastMethod) {
            const trustCookie = ctx.context.createAuthCookie('trust_device', { maxAge: TRUST_DEVICE_MAX_AGE_SECS })
            const trustValue = await ctx.getSignedCookie(trustCookie.name, ctx.context.secret)
            if (trustValue) {
              expireCookie(ctx, trustCookie)
            }
          }
          await refreshSession(ctx, user.id, session.token)
          sendSecurityAlertEmail({
            email: user.email,
            subject: 'Two-factor authentication disabled',
            message: 'TOTP two-factor authentication has been disabled on your account.',
          }).catch((err) => console.error('[2fa] Failed to send security alert email', err))
          return ctx.json({ status: true })
        },
      ),

      verifyBackupCode: createAuthEndpoint(
        '/two-factor/verify-backup-code',
        { method: 'POST', body: z.object({ code: z.string().min(11).max(11) }), requireHeaders: true },
        async (ctx) => {
          const { identifier, userId, twoFactorCookie } = await resolvePendingCookie(ctx)
          const unusedCodes = await db.query.userBackupCodes.findMany({
            where: and(eq(userBackupCodes.userId, userId), isNull(userBackupCodes.usedAt)),
            orderBy: (t, { asc }) => [asc(t.codeIndex)],
          })
          if (unusedCodes.length === 0) {
            throw new APIError('UNAUTHORIZED', {
              message: 'No backup codes available',
              code: 'INVALID_BACKUP_CODE',
            })
          }
          let matchedRow: (typeof unusedCodes)[0] | null = null
          for (const row of unusedCodes) {
            const plain = await symmetricDecrypt({
              key: ctx.context.secretConfig,
              data: row.codeEncrypted,
            })
            if (constantTimeEqual(plain, ctx.body.code.trim())) {
              matchedRow = row
              break
            }
          }
          if (!matchedRow) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Invalid backup code',
              code: 'INVALID_BACKUP_CODE',
            })
          }
          const updated = await db
            .update(userBackupCodes)
            .set({ usedAt: new Date() })
            .where(and(eq(userBackupCodes.id, matchedRow.id), isNull(userBackupCodes.usedAt)))
            .returning()
          if (updated.length === 0) {
            throw new APIError('CONFLICT', {
              message: 'Backup code already used, please try again',
              code: 'BACKUP_CODE_ALREADY_USED',
            })
          }
          const { session, user } = await completeSignIn(ctx, userId, identifier, twoFactorCookie)
          sendSecurityAlertEmail({
            email: user.email,
            subject: 'Backup code used',
            message:
              'A backup code was used to sign in to your account. If this was not you, please secure your account immediately.',
          }).catch((err) => console.error('[2fa] Failed to send security alert email', err))
          return ctx.json({ token: session.token, user })
        },
      ),

      getBackupCodes: createAuthEndpoint(
        '/two-factor/get-backup-codes',
        { method: 'POST', body: z.object({ password: z.string() }), requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user } = sessionData
          await ctx.context.password.checkPassword(user.id, ctx)
          const rows = await db.query.userBackupCodes.findMany({
            where: eq(userBackupCodes.userId, user.id),
            orderBy: (t, { asc }) => [asc(t.codeIndex)],
          })
          if (rows.length === 0) {
            throw new APIError('NOT_FOUND', {
              message: 'No backup codes found',
              code: 'NO_BACKUP_CODES',
            })
          }
          const codes = await Promise.all(
            rows.map(async (row) => {
              const code = await symmetricDecrypt({
                key: ctx.context.secretConfig,
                data: row.codeEncrypted,
              })
              return { code, usedAt: row.usedAt?.toISOString() ?? null }
            }),
          )
          return ctx.json({ codes })
        },
      ),

      regenerateBackupCodes: createAuthEndpoint(
        '/two-factor/regenerate-backup-codes',
        { method: 'POST', body: z.object({ password: z.string() }), requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user } = sessionData
          await ctx.context.password.checkPassword(user.id, ctx)
          const plain = await insertFreshBackupCodes(user.id, ctx.context.secretConfig)
          sendSecurityAlertEmail({
            email: user.email,
            subject: 'Backup codes regenerated',
            message:
              'Your two-factor authentication backup codes have been regenerated. Your old codes are no longer valid.',
          }).catch((err) => console.error('[2fa] Failed to send security alert email', err))
          return ctx.json({ codes: plain })
        },
      ),

      twoFactorStatus: createAuthEndpoint(
        '/two-factor/status',
        { method: 'GET', requireHeaders: true },
        async (ctx) => {
          const sessionData = await getSessionFromCtx(ctx)
          if (!sessionData) {
            throw new APIError('UNAUTHORIZED', {
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED',
            })
          }
          const { user } = sessionData
          const methods = await db.query.userTwoFactorMethods.findMany({
            where: eq(userTwoFactorMethods.userId, user.id),
          })
          return ctx.json({
            twoFactorEnabled: user.twoFactorEnabled ?? false,
            enabledMethods: methods.map((m) => m.method),
          })
        },
      ),
    },
    rateLimit: [
      {
        pathMatcher: (p: string) =>
          [
            '/two-factor/verify-totp',
            '/two-factor/verify-email-otp',
            '/two-factor/verify-backup-code',
            '/two-factor/send-email-otp',
          ].includes(p),
        window: 10,
        max: 3,
      },
      {
        pathMatcher: (p: string) => p.startsWith('/two-factor/'),
        window: 60,
        max: 10,
      },
    ],
  } satisfies BetterAuthPlugin
}
