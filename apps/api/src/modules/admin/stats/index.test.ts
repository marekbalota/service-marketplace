import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { adminStatsRoutes } from '.'
import { authRoutes } from '../../auth'
import { errorsPlugin } from '../../../lib/errors'
import { auth } from '../../auth/service'

const app = new Elysia().use(errorsPlugin).use(authRoutes).use(adminStatsRoutes)
const client = treaty(app)

let adminCookie: string
let aliceCookie: string

beforeAll(async () => {
  const adminRes = await auth.api.signInEmail({
    body: { email: 'admin@example.com', password: 'admin123' },
    asResponse: true,
  })
  adminCookie = adminRes.headers.get('set-cookie') ?? ''

  const aliceRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  aliceCookie = aliceRes.headers.get('set-cookie') ?? ''
})

describe('GET /admin/stats', () => {
  it('returns 401 without session', async () => {
    const { error } = await client.admin.stats.get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    const { error } = await client.admin.stats.get({ headers: { Cookie: aliceCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns correct shape with numeric counts', async () => {
    const { data, error } = await client.admin.stats.get({ headers: { Cookie: adminCookie } })
    expect(error).toBeNull()
    expect(typeof data!.totalUsers).toBe('number')
    expect(typeof data!.activePosts).toBe('number')
    expect(typeof data!.totalMessages).toBe('number')
    expect(typeof data!.activeBans).toBe('number')
    expect(data!.totalUsers).toBeGreaterThanOrEqual(0)
  })

  it('activeBans <= totalUsers', async () => {
    const { data } = await client.admin.stats.get({ headers: { Cookie: adminCookie } })
    expect(data!.activeBans).toBeLessThanOrEqual(data!.totalUsers)
  })
})

describe('GET /admin/stats/recent-users', () => {
  it('returns 401 without session', async () => {
    const { error } = await client.admin.stats['recent-users'].get()
    expect(error?.status).toBe(401)
  })

  it('returns at most 5 users', async () => {
    const { data, error } = await client.admin.stats['recent-users'].get({
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
    expect(data!.items.length).toBeLessThanOrEqual(4)
  })

  it('items have userId, name, email, createdAt', async () => {
    const { data } = await client.admin.stats['recent-users'].get({
      headers: { Cookie: adminCookie },
    })
    if (data!.items.length > 0) {
      const item = data!.items[0]!
      expect(typeof item.userId).toBe('string')
      expect(typeof item.name).toBe('string')
      expect(typeof item.email).toBe('string')
      expect(item.createdAt).toBeTruthy()
    }
  })

  it('items are sorted newest first', async () => {
    const { data } = await client.admin.stats['recent-users'].get({
      headers: { Cookie: adminCookie },
    })
    const dates = data!.items.map((i) => new Date(i.createdAt).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]!).toBeGreaterThanOrEqual(dates[i]!)
    }
  })
})
