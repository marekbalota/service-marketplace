import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { profilesRoutes } from '../profiles'
import { authRoutes } from '../auth'

const app = new Elysia().use(authRoutes).use(profilesRoutes)
const client = treaty(app)

let sessionCookie = ''
let profileId = ''

beforeAll(async () => {
  const signInRes = await app.handle(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
    }),
  )
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''

  const { data } = await client.profiles.me.get({ headers: { Cookie: sessionCookie } })
  profileId = data?.[0]?.userProfileId ?? ''
})

describe('GET /profiles/:id/locations', () => {
  it('returns 200 with an array', async () => {
    const { data, error } = await client.profiles({ id: profileId }).locations.get()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('each location has locationId as string', async () => {
    const { data } = await client.profiles({ id: profileId }).locations.get()
    for (const loc of data ?? []) {
      expect(typeof loc.locationId).toBe('string')
    }
  })

  it('returns empty array for a profile with no posts at that id', async () => {
    const { data, error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).locations.get()
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
