import { describe, it, expect } from 'bun:test'
import { auth, verificationTokenStore } from '../auth/service'
import { app } from '../../index'
import { treaty } from '@elysiajs/eden'

const client = treaty(app)

const PASSWORD = 'password123'
const CAPTCHA = new Headers({ 'x-captcha-response': 'test-token' })

async function setupVerifiedUser(email: string) {
  await auth.api.signUpEmail({
    body: { email, name: 'TF Test', password: PASSWORD },
    headers: CAPTCHA,
  })
  const token = verificationTokenStore.get(email)!
  await auth.api.verifyEmail({ query: { token } })
}

async function getSessionCookie(email: string): Promise<string> {
  const res = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    headers: CAPTCHA,
    asResponse: true,
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  return setCookie
}

describe('GET /two-factor/status — unauthenticated', () => {
  it('returns 401', async () => {
    const { status } = await client['two-factor'].status.get()
    expect(status).toBe(401)
  })
})

describe('GET /two-factor/status — authenticated, 2FA disabled', () => {
  const email = `tf-no2fa-${Date.now()}@example.com`

  it('returns twoFactorEnabled=false, enabledMethods=[]', async () => {
    await setupVerifiedUser(email)
    const cookie = await getSessionCookie(email)
    const { data, status } = await client['two-factor'].status.get({
      headers: { cookie },
    })
    expect(status).toBe(200)
    expect(data?.twoFactorEnabled).toBe(false)
    expect(data?.enabledMethods).toEqual([])
  })
})
