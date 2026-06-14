import { describe, it, expect, beforeAll } from 'bun:test'
import { app } from '../../index'
import { treaty } from '@elysiajs/eden'
import { auth } from '../auth/service'
import { db } from '../../db'
import { sessions, users } from '../../db/schema'
import { eq } from 'drizzle-orm'

const client = treaty(app)

async function signIn(email: string, password: string): Promise<string> {
  const res = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  })
  return res.headers.get('set-cookie') ?? ''
}

// Use a real admin userId for impersonatedBy to satisfy FK constraint
let adminUserId: string

beforeAll(async () => {
  const adminUser = await db.query.users.findFirst({
    where: eq(users.email, 'admin@example.com'),
  })
  adminUserId = adminUser!.id
})

describe('GET /sessions', () => {
  let cookie: string
  let userId: string

  beforeAll(async () => {
    cookie = await signIn('alice@example.com', 'password123')
    const { data } = await client.users.me.get({ headers: { Cookie: cookie } })
    userId = data!.userId
  })

  it('returns 401 without session', async () => {
    const { status } = await client.sessions.get()
    expect(status).toBe(401)
  })

  it('returns sessions for authenticated user', async () => {
    const { data, error } = await client.sessions.get({ headers: { Cookie: cookie } })
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    expect(data!.length).toBeGreaterThan(0)
    const s = data![0]!
    expect(typeof s.id).toBe('string')
    expect(s.createdAt).toBeDefined()
    expect(s.updatedAt).toBeDefined()
  })

  it('excludes impersonation sessions from the response', async () => {
    const fakeImpersonationId = crypto.randomUUID()
    await db.insert(sessions).values({
      id: fakeImpersonationId,
      userId,
      token: `impersonation-test-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3_600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      impersonatedBy: adminUserId,
    })

    const { data } = await client.sessions.get({ headers: { Cookie: cookie } })
    const ids = data!.map((s) => s.id)
    expect(ids).not.toContain(fakeImpersonationId)

    await db.delete(sessions).where(eq(sessions.id, fakeImpersonationId))
  })
})

describe('DELETE /sessions/:id', () => {
  let cookie: string
  let userId: string
  let anotherCookie: string

  beforeAll(async () => {
    cookie = await signIn('alice@example.com', 'password123')
    const { data } = await client.users.me.get({ headers: { Cookie: cookie } })
    userId = data!.userId

    anotherCookie = await signIn('user@example.com', 'password123')
  })

  it('returns 401 without session', async () => {
    const { status } = await client.sessions({ id: crypto.randomUUID() }).delete()
    expect(status).toBe(401)
  })

  it('returns 404 for a session belonging to another user', async () => {
    const { data: bobSessions } = await client.sessions.get({ headers: { Cookie: anotherCookie } })
    const bobSessionId = bobSessions![0]!.id
    const { status } = await client
      .sessions({ id: bobSessionId })
      .delete(undefined, { headers: { Cookie: cookie } })
    expect(status).toBe(404)
  })

  it('returns 404 for an impersonation session', async () => {
    const fakeImpersonationId = crypto.randomUUID()
    await db.insert(sessions).values({
      id: fakeImpersonationId,
      userId,
      token: `imp-revoke-test-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3_600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      impersonatedBy: adminUserId,
    })

    const { status } = await client.sessions({ id: fakeImpersonationId }).delete(undefined, {
      headers: { Cookie: cookie },
    })
    expect(status).toBe(404)

    await db.delete(sessions).where(eq(sessions.id, fakeImpersonationId))
  })
})

describe('DELETE /sessions (bulk)', () => {
  let cookie: string
  let userId: string

  beforeAll(async () => {
    cookie = await signIn('alice@example.com', 'password123')
    const { data } = await client.users.me.get({ headers: { Cookie: cookie } })
    userId = data!.userId
  })

  it('returns 401 without session', async () => {
    const { status } = await client.sessions.delete()
    expect(status).toBe(401)
  })

  it('does not delete impersonation sessions', async () => {
    const fakeImpersonationId = crypto.randomUUID()
    await db.insert(sessions).values({
      id: fakeImpersonationId,
      userId,
      token: `imp-bulk-test-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3_600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      impersonatedBy: adminUserId,
    })

    await client.sessions.delete(undefined, { headers: { Cookie: cookie } })

    const remaining = await db.query.sessions.findFirst({
      where: eq(sessions.id, fakeImpersonationId),
    })
    expect(remaining).toBeDefined()

    await db.delete(sessions).where(eq(sessions.id, fakeImpersonationId))
  })
})
