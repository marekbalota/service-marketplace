import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { profilesRoutes } from '.'
import { authRoutes } from '../auth'
import { usersRoutes } from '../users'
import { auth } from '../auth/service'
import { LocationsModel } from '../locations'

const app = new Elysia().use(authRoutes).use(usersRoutes).use(profilesRoutes)
const client = treaty(app)

let aliceCookie: string
let aliceProfileId: string

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  aliceCookie = signInRes.headers.get('set-cookie') ?? ''

  // Get profile ID from /users/me which includes profiles
  const meRes = await app.handle(new Request('http://localhost/users/me', {
    headers: { Cookie: aliceCookie },
  }))
  const meData = await meRes.json() as { profiles: { userProfileId: string }[] }
  aliceProfileId = meData.profiles[0]?.userProfileId ?? ''
})

describe('GET /profiles/:id', () => {
  it('returns 404 for unknown id', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).get()
    expect(error?.status).toBe(404)
  })

  it('returns a profile for a known id', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).get()
    expect(error).toBeNull()
    expect(data!.userProfileId).toBe(aliceProfileId)
  })
})

describe('PATCH /profiles/:id', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).patch({ name: 'Test' })
    expect(error?.status).toBe(401)
  })

  it('returns 403 when patching a profile not owned by the user', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).patch(
      { name: 'Test' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 422 for invalid body (bad email)', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).patch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { email: 'not-an-email' as any },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('updates own profile and returns 204, changes are persisted', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).patch(
      { bio: 'Updated bio from test' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()

    const { data } = await client.profiles({ id: aliceProfileId }).get()
    expect(data!.bio).toBe('Updated bio from test')
  })
})

describe('GET /profiles/:profileId/posts', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).posts.get()
    expect(error?.status).toBe(401)
  })

  it('returns 200 with items, total, and totalPages when authenticated', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).posts.get({
      headers: { Cookie: aliceCookie }
    })
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
    expect(typeof data!.total).toBe('number')
    expect(typeof data!.totalPages).toBe('number')
  })

  it('only returns posts authored by the given profile', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).posts.get({
      headers: { Cookie: aliceCookie }
    })
    for (const post of data!.items) {
      expect(post.authorId).toBe(aliceProfileId)
    }
  })

  it('returns 200 with empty array for unknown profile', async () => {
    const { data, error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).posts.get({
      headers: { Cookie: aliceCookie }
    })
    expect(error).toBeNull()
    expect(data!.items).toHaveLength(0)
    expect(data!.total).toBe(0)
  })

  it('size param limits number of returned items', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).posts.get({
      query: { size: 1 },
      headers: { Cookie: aliceCookie },
    })
    expect(data!.items.length).toBeLessThanOrEqual(1)
  })

  it('totalPages is ceil(total / size)', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).posts.get({
      query: { size: 2 },
      headers: { Cookie: aliceCookie },
    })
    const expected = Math.ceil(data!.total / 2)
    expect(data!.totalPages).toBe(expected)
  })

  it('offset paginates to a different set of items', async () => {
    const { data: page1 } = await client.profiles({ id: aliceProfileId }).posts.get({
      query: { size: 1, offset: 0 },
      headers: { Cookie: aliceCookie },
    })
    const { data: page2 } = await client.profiles({ id: aliceProfileId }).posts.get({
      query: { size: 1, offset: 1 },
      headers: { Cookie: aliceCookie },
    })
    if (page1!.total > 1) {
      expect(page1!.items[0]!.postId).not.toBe(page2!.items[0]?.postId)
    }
  })
})

describe('GET /profiles/:id/locations', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).locations.get()
    expect(error?.status).toBe(401)
  })

  it('returns 200 with an array when authenticated', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).locations.get({
      headers: { Cookie: aliceCookie }
    })
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('each location has locationId as string', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).locations.get({
      headers: { Cookie: aliceCookie }
    })
    for (const loc of data ?? []) {
      expect(typeof loc.locationId).toBe('string')
    }
  })

  it('returns empty array for a profile with no posts at that id', async () => {
    const { data, error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).locations.get({
      headers: { Cookie: aliceCookie }
    })
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

