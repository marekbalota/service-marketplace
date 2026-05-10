import { describe, it, expect, beforeAll } from 'bun:test'
import { auth } from './service'
import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

// Seed users:
// admin@example.com / admin123         -> SuperAdmin (priority 2) - has impersonate permission
// alice@example.com / password123      -> User (priority 0)
// bob@example.com   / password123      -> User (priority 0)

let adminCookie: string
let adminUserId: string
let aliceUserId: string

/**
 * Converts set-cookie response headers into a Cookie request header string.
 * Multiple set-cookie headers are comma-joined by Headers.get(), so this splits
 * them on the boundary between entries (after the attributes of each cookie).
 * A simpler approach: collect all set-cookie entries via the Headers iterator
 * and strip each down to name=value.
 */
function setCookiesToRequestCookie(headers: Headers): string {
  const cookieMap = new Map<string, string>()
  // Headers.getSetCookie() is the spec-compliant way to get all set-cookie values
  const setCookieHeaders: string[] =
    typeof (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : (headers.get('set-cookie') ?? '').split(/,(?=[^ ])/).map((s) => s.trim())

  for (const setCookie of setCookieHeaders) {
    // Each set-cookie value is: name=value; attr1; attr2=v; ...
    const nameValue = setCookie.split(';')[0]?.trim()
    if (!nameValue) {
      continue
    }
    const eqIdx = nameValue.indexOf('=')
    if (eqIdx === -1) {
      continue
    }
    const name = nameValue.slice(0, eqIdx).trim()
    const value = nameValue.slice(eqIdx + 1).trim()
    // Max-Age=0 means the cookie is being deleted — skip it
    if (setCookie.includes('Max-Age=0')) {
      cookieMap.delete(name)
    } else {
      cookieMap.set(name, value)
    }
  }

  return [...cookieMap.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

beforeAll(async () => {
  const adminSignIn = await auth.api.signInEmail({
    body: { email: 'admin@example.com', password: 'admin123' },
    asResponse: true,
  })
  adminCookie = setCookiesToRequestCookie(adminSignIn.headers)

  const adminUser = await db.query.users.findFirst({
    where: eq(users.email, 'admin@example.com'),
  })
  adminUserId = adminUser!.id

  const aliceUser = await db.query.users.findFirst({
    where: eq(users.email, 'alice@example.com'),
  })
  aliceUserId = aliceUser!.id
})

describe('POST /api/auth/admin/impersonate-user', () => {
  it('returns 200 and sets impersonation session when admin impersonates lower-priority user', async () => {
    const res = await auth.api.impersonateUser({
      body: { userId: aliceUserId },
      headers: new Headers({ Cookie: adminCookie }),
      asResponse: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { session: { impersonatedBy: string }; user: { id: string } }
    expect(body.session.impersonatedBy).toBe(adminUserId)
    expect(body.user.id).toBe(aliceUserId)

    // The response should set a new session cookie
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain('better-auth')
  })

  it('returns 403 when trying to impersonate a user with equal or higher priority (self)', async () => {
    const res = await auth.api.impersonateUser({
      body: { userId: adminUserId },
      headers: new Headers({ Cookie: adminCookie }),
      asResponse: true,
    })
    expect(res.status).toBe(403)
  })

  it('returns 401 when called without a session', async () => {
    const res = await auth.api.impersonateUser({
      body: { userId: aliceUserId },
      headers: new Headers(),
      asResponse: true,
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when a regular user (no impersonate permission) tries to impersonate', async () => {
    const aliceSignIn = await auth.api.signInEmail({
      body: { email: 'alice@example.com', password: 'password123' },
      asResponse: true,
    })
    const aliceCookie = setCookiesToRequestCookie(aliceSignIn.headers)

    const bobUser = await db.query.users.findFirst({
      where: eq(users.email, 'bob@example.com'),
    })

    const res = await auth.api.impersonateUser({
      body: { userId: bobUser!.id },
      headers: new Headers({ Cookie: aliceCookie }),
      asResponse: true,
    })
    expect(res.status).toBe(403)
  })

  it('returns 404 when target user does not exist', async () => {
    const res = await auth.api.impersonateUser({
      body: { userId: '00000000-0000-0000-0000-000000000000' },
      headers: new Headers({ Cookie: adminCookie }),
      asResponse: true,
    })
    expect(res.status).toBe(404)
  })

  it('returns 403 when trying to start a new impersonation while already impersonating', async () => {
    // Set up a fresh admin session and start impersonating Alice
    const adminSignIn = await auth.api.signInEmail({
      body: { email: 'admin@example.com', password: 'admin123' },
      asResponse: true,
    })
    const freshAdminCookie = setCookiesToRequestCookie(adminSignIn.headers)

    const impersonateRes = await auth.api.impersonateUser({
      body: { userId: aliceUserId },
      headers: new Headers({ Cookie: freshAdminCookie }),
      asResponse: true,
    })
    expect(impersonateRes.status).toBe(200)
    const impersonationCookies = setCookiesToRequestCookie(impersonateRes.headers)

    // Try to impersonate again while already in an impersonation session
    const bobUser = await db.query.users.findFirst({ where: eq(users.email, 'bob@example.com') })
    const res = await auth.api.impersonateUser({
      body: { userId: bobUser!.id },
      headers: new Headers({ Cookie: impersonationCookies }),
      asResponse: true,
    })
    expect(res.status).toBe(403)
    const body = (await res.json()) as { message: string }
    expect(body.message).toMatch(/already impersonating/i)
  })
})

describe('POST /api/auth/admin/stop-impersonating', () => {
  it('restores admin session and deletes impersonation session', async () => {
    // Start fresh admin sign-in to get a clean session
    const adminSignIn = await auth.api.signInEmail({
      body: { email: 'admin@example.com', password: 'admin123' },
      asResponse: true,
    })
    const freshAdminCookie = setCookiesToRequestCookie(adminSignIn.headers)

    // Impersonate alice
    const impersonateRes = await auth.api.impersonateUser({
      body: { userId: aliceUserId },
      headers: new Headers({ Cookie: freshAdminCookie }),
      asResponse: true,
    })
    expect(impersonateRes.status).toBe(200)

    // Build a Cookie header from all the set-cookie values returned by impersonation
    const impersonationCookies = setCookiesToRequestCookie(impersonateRes.headers)

    // Stop impersonating using the impersonation session cookie (which includes admin_session)
    const stopRes = await auth.api.stopImpersonating({
      headers: new Headers({ Cookie: impersonationCookies }),
      asResponse: true,
    })
    expect(stopRes.status).toBe(200)
    const stopBody = (await stopRes.json()) as { session: { userId: string }; user: { id: string } }
    expect(stopBody.user.id).toBe(adminUserId)
  })

  it('returns 500 when admin_session cookie is absent', async () => {
    const adminSignIn = await auth.api.signInEmail({
      body: { email: 'admin@example.com', password: 'admin123' },
      asResponse: true,
    })
    const freshAdminCookie = setCookiesToRequestCookie(adminSignIn.headers)

    const impersonateRes = await auth.api.impersonateUser({
      body: { userId: aliceUserId },
      headers: new Headers({ Cookie: freshAdminCookie }),
      asResponse: true,
    })
    expect(impersonateRes.status).toBe(200)

    // Strip the admin_session and its signature cookie so only the impersonation session remains
    const impersonationCookies = setCookiesToRequestCookie(impersonateRes.headers)
      .split('; ')
      .filter((c) => !c.startsWith('better-auth.admin_session'))
      .join('; ')

    const res = await auth.api.stopImpersonating({
      headers: new Headers({ Cookie: impersonationCookies }),
      asResponse: true,
    })
    expect(res.status).toBe(500)
  })

  it('returns 500 when admin_session cookie has been tampered with', async () => {
    const adminSignIn = await auth.api.signInEmail({
      body: { email: 'admin@example.com', password: 'admin123' },
      asResponse: true,
    })
    const freshAdminCookie = setCookiesToRequestCookie(adminSignIn.headers)

    const impersonateRes = await auth.api.impersonateUser({
      body: { userId: aliceUserId },
      headers: new Headers({ Cookie: freshAdminCookie }),
      asResponse: true,
    })
    expect(impersonateRes.status).toBe(200)

    // Replace the admin_session value with garbage so signature validation fails
    const impersonationCookies = setCookiesToRequestCookie(impersonateRes.headers)
      .split('; ')
      .map((c) =>
        c.startsWith('better-auth.admin_session=') ? 'better-auth.admin_session=tampered_value' : c,
      )
      .join('; ')

    const res = await auth.api.stopImpersonating({
      headers: new Headers({ Cookie: impersonationCookies }),
      asResponse: true,
    })
    expect(res.status).toBe(500)
  })

  it('returns 400 when not currently impersonating', async () => {
    // Sign in as admin (no impersonation active)
    const adminSignIn = await auth.api.signInEmail({
      body: { email: 'admin@example.com', password: 'admin123' },
      asResponse: true,
    })
    const freshAdminCookie = setCookiesToRequestCookie(adminSignIn.headers)

    const res = await auth.api.stopImpersonating({
      headers: new Headers({ Cookie: freshAdminCookie }),
      asResponse: true,
    })
    expect(res.status).toBe(400)
  })
})
