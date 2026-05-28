import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { adminAnalyticsRoutes } from '.'
import { authRoutes } from '../../auth'
import { errorsPlugin } from '../../../lib/errors'
import { auth } from '../../auth/service'

const app = new Elysia().use(errorsPlugin).use(authRoutes).use(adminAnalyticsRoutes)
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

describe('GET /admin/analytics/:metric', () => {
  it('returns 401 without session', async () => {
    const { error } = await client.admin.analytics.users.get({
      query: { to: '2026-05-27', granularity: 'month' },
    })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin', async () => {
    const { error } = await client.admin.analytics.users.get({
      query: { to: '2026-05-27', granularity: 'month' },
      headers: { Cookie: aliceCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('returns 422 when to is missing', async () => {
    const { error } = await client.admin.analytics.users.get({
      // @ts-expect-error intentional missing required field
      query: {},
      headers: { Cookie: adminCookie },
    })
    expect(error?.status).toBe(422)
  })

  it.each(['users', 'posts', 'messages'] as const)(
    'returns correct shape for metric=%s',
    async (metric) => {
      const { data, error } = await client.admin.analytics[metric].get({
        query: { from: '2026-01-01', to: '2026-01-07', granularity: 'day' },
        headers: { Cookie: adminCookie },
      })
      expect(error).toBeNull()
      expect(Array.isArray(data!.items)).toBe(true)
      expect(typeof data!.total).toBe('number')
      data!.items.forEach((item) => {
        expect(item.bucket).toBeInstanceOf(Date)
        expect(typeof item.count).toBe('number')
      })
    },
  )

  it('returns 24 hourly buckets for a single day', async () => {
    const { data, error } = await client.admin.analytics.users.get({
      query: { from: '2026-01-01', to: '2026-01-01', granularity: 'hour' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items).toHaveLength(24)
    data!.items.forEach((item) => {
      expect(item.bucket).toBeInstanceOf(Date)
    })
  })

  it('returns 7 daily buckets for a 7-day window', async () => {
    const { data, error } = await client.admin.analytics.users.get({
      query: { from: '2026-01-01', to: '2026-01-07', granularity: 'day' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items).toHaveLength(7)
  })

  it('returns weekly buckets for a 30-day window with granularity=week', async () => {
    const { data, error } = await client.admin.analytics.users.get({
      query: { from: '2026-01-01', to: '2026-01-30', granularity: 'week' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    // 30 days with weekly granularity yields ~4–5 buckets
    expect(data!.items.length).toBeGreaterThanOrEqual(4)
    expect(data!.items.length).toBeLessThanOrEqual(5)
  })

  it('returns 12 monthly buckets for a full calendar year', async () => {
    const { data, error } = await client.admin.analytics.users.get({
      query: { from: '2025-01-01', to: '2025-12-31', granularity: 'month' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items).toHaveLength(12)
    data!.items.forEach((item) => {
      expect(item.bucket).toBeInstanceOf(Date)
    })
  })

  it('handles all-time query (no from)', async () => {
    const { data, error } = await client.admin.analytics.users.get({
      query: { to: '2026-05-27', granularity: 'month' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
  })
})
