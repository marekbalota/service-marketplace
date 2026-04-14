import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { authRoutes } from '../auth'
import { auth } from '../auth/service'

const app = new Elysia().use(authRoutes).use(usersRoutes).use(profilesRoutes)
const client = treaty(app)

let sessionCookie = ''
let profileId = ''

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''

  const { data: meData } = await client.users.me.get({ headers: { Cookie: sessionCookie } })
  profileId = meData!.profiles[0]?.userProfileId ?? ''
})

describe('GET /profiles/:id/locations', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles({ id: profileId }).locations.get()
    expect(error?.status).toBe(401)
  })

  it('returns 200 with an array when authenticated', async () => {
    const { data, error } = await client.profiles({ id: profileId }).locations.get({
      headers: { Cookie: sessionCookie }
    })
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('each location has locationId as string', async () => {
    const { data } = await client.profiles({ id: profileId }).locations.get({
      headers: { Cookie: sessionCookie }
    })
    for (const loc of data ?? []) {
      expect(typeof loc.locationId).toBe('string')
    }
  })

  it('returns empty array for a profile with no posts at that id', async () => {
    const { data, error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).locations.get({
      headers: { Cookie: sessionCookie }
    })
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
