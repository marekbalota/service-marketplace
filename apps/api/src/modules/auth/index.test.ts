import { describe, it, expect } from 'bun:test'
import {
  auth,
  verificationTokenStore,
  resetTokenStore,
  existingSignupNotifiedEmails,
} from './service'
import { db } from '../../db'

const TEST_EMAIL = `auth-test-${Date.now()}@example.com`
const TEST_NAME = 'Auth Test User'
const TEST_PASSWORD = 'password123'
const CAPTCHA_HEADERS = new Headers({ 'x-captcha-response': 'test-token' })

function getLatestVerificationToken(email: string): string {
  const token = verificationTokenStore.get(email)
  if (!token) {
    throw new Error(`No verification token found for ${email}`)
  }
  return token
}

describe('POST /api/auth/sign-up/email', () => {
  it('returns 200 and creates a user row', async () => {
    const res = await auth.api.signUpEmail({
      body: { email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { user: { email: string } }
    expect(body.user.email).toBe(TEST_EMAIL)
  })

  it('auto-creates a userProfile linked to the new user', async () => {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, TEST_EMAIL),
    })
    expect(user).toBeTruthy()

    const profile = await db.query.userProfiles.findFirst({
      where: (p, { eq }) => eq(p.accountId, user!.id),
    })
    expect(profile).toBeTruthy()
    expect(profile!.email).toBe(TEST_EMAIL)
  })

  it('returns 200 (not 422) for duplicate email when requireEmailVerification is on', async () => {
    const res = await auth.api.signUpEmail({
      body: { email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(200)
  })

  it('creates user with emailVerified false', async () => {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, TEST_EMAIL),
    })
    expect(user?.emailVerified).toBe(false)
  })

  it('returns 400 when x-captcha-response header is missing', async () => {
    const res = await auth.api.signUpEmail({
      body: {
        email: `no-captcha-${Date.now()}@example.com`,
        name: TEST_NAME,
        password: TEST_PASSWORD,
      },
      headers: new Headers(),
      asResponse: true,
    })
    expect(res.status).toBe(400)
  })
})

describe('onExistingUserSignUp callback', () => {
  it('records the email in existingSignupNotifiedEmails when sign-up is attempted with an existing email', async () => {
    existingSignupNotifiedEmails.clear()
    await auth.api.signUpEmail({
      body: { email: TEST_EMAIL, name: TEST_NAME, password: TEST_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(existingSignupNotifiedEmails.has(TEST_EMAIL)).toBe(true)
  })
})

describe('Email verification', () => {
  it('sign-in before verification returns 403', async () => {
    const res = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(403)
  })

  it('verifying email marks the user as verified in DB', async () => {
    const token = await getLatestVerificationToken(TEST_EMAIL)
    const res = await auth.api.verifyEmail({
      query: { token, callbackURL: 'http://localhost:3000/verify-email/callback' },
      asResponse: true,
    })
    expect(res.status).toBeLessThan(400)

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, TEST_EMAIL),
    })
    expect(user?.emailVerified).toBe(true)
  })
})

describe('POST /api/auth/sign-in/email', () => {
  it('returns 200 and sets a session cookie', async () => {
    const res = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(200)
    const cookie = res.headers.get('set-cookie')
    expect(cookie).toBeTruthy()
    expect(cookie).toContain('better-auth.session_token')
  })

  it('returns 401 for wrong password', async () => {
    const res = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: 'wrong-password' },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when x-captcha-response header is missing', async () => {
    const res = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      headers: new Headers(),
      asResponse: true,
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/sign-out', () => {
  it('returns 200', async () => {
    const signInRes = await auth.api.signInEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    const cookie = signInRes.headers.get('set-cookie') ?? ''

    const res = await auth.api.signOut({
      headers: new Headers({ Cookie: cookie }),
      asResponse: true,
    })
    expect(res.status).toBe(200)
  })
})

describe('Password reset', () => {
  const RESET_EMAIL = `reset-test-${Date.now()}@example.com`
  const RESET_PASSWORD = 'initial-password123'
  const NEW_PASSWORD = 'new-password456'

  it('set up: registers and verifies a user for reset tests', async () => {
    const signUpRes = await auth.api.signUpEmail({
      body: { email: RESET_EMAIL, name: 'Reset Test User', password: RESET_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(signUpRes.status).toBe(200)
    const token = verificationTokenStore.get(RESET_EMAIL)
    if (!token) throw new Error('No verification token')
    const verifyRes = await auth.api.verifyEmail({
      query: { token, callbackURL: 'http://localhost:3000/verify-email/callback' },
      asResponse: true,
    })
    expect(verifyRes.status).toBeLessThan(400)
  })

  it('requestPasswordReset returns 200 (does not reveal whether user exists)', async () => {
    const res = await auth.api.requestPasswordReset({
      body: { email: RESET_EMAIL, redirectTo: 'http://localhost:3000/reset-password' },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(200)
  })

  it('requestPasswordReset for unknown email still returns 200 (enumeration prevention)', async () => {
    const res = await auth.api.requestPasswordReset({
      body: {
        email: 'ghost-nobody@example.com',
        redirectTo: 'http://localhost:3000/reset-password',
      },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(200)
  })

  it('requestPasswordReset returns 400 when x-captcha-response header is missing', async () => {
    const res = await auth.api.requestPasswordReset({
      body: { email: RESET_EMAIL, redirectTo: 'http://localhost:3000/reset-password' },
      headers: new Headers(),
      asResponse: true,
    })
    expect(res.status).toBe(400)
  })

  it('stores reset token in resetTokenStore during tests', () => {
    expect(resetTokenStore.get(RESET_EMAIL)).toBeTruthy()
  })

  it('resetPassword with valid token returns 200', async () => {
    const token = resetTokenStore.get(RESET_EMAIL)!
    const res = await auth.api.resetPassword({
      body: { token, newPassword: NEW_PASSWORD },
      asResponse: true,
    })
    expect(res.status).toBe(200)
  })

  it('can sign in with new password after reset', async () => {
    const res = await auth.api.signInEmail({
      body: { email: RESET_EMAIL, password: NEW_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(200)
  })

  it('cannot sign in with old password after reset', async () => {
    const res = await auth.api.signInEmail({
      body: { email: RESET_EMAIL, password: RESET_PASSWORD },
      headers: CAPTCHA_HEADERS,
      asResponse: true,
    })
    expect(res.status).toBe(401)
  })
})
