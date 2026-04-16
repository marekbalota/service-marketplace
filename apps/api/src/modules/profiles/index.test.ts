import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { profilesRoutes } from '.'
import { authRoutes } from '../auth'
import { auth } from '../auth/service'

const app = new Elysia().use(authRoutes).use(profilesRoutes)
const client = treaty(app)

let aliceCookie: string
let aliceProfileId: string

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  aliceCookie = signInRes.headers.get('set-cookie') ?? ''

  const { data } = await client.profiles.me.get({ headers: { Cookie: aliceCookie } })
  aliceProfileId = data?.[0]?.userProfileId ?? ''
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
})

describe('GET /profiles/:profileId/posts', () => {
  it('returns 200 with items, total, and totalPages', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).posts.get()
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
    expect(typeof data!.total).toBe('number')
    expect(typeof data!.totalPages).toBe('number')
  })

  it('only returns posts authored by the given profile', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).posts.get()
    for (const post of data!.items) {
      expect(post.authorId).toBe(aliceProfileId)
    }
  })

  it('returns 200 with empty items for unknown profile', async () => {
    const { data, error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).posts.get()
    expect(error).toBeNull()
    expect(data!.items).toHaveLength(0)
    expect(data!.total).toBe(0)
  })

  it('size param limits number of returned items', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).posts.get({ query: { size: 1 } })
    expect(data!.items.length).toBeLessThanOrEqual(1)
  })

  it('totalPages is ceil(total / size)', async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).posts.get({ query: { size: 2 } })
    const expected = Math.ceil(data!.total / 2)
    expect(data!.totalPages).toBe(expected)
  })

  it('offset paginates to a different set of items', async () => {
    const { data: page1 } = await client.profiles({ id: aliceProfileId }).posts.get({ query: { size: 1, offset: 0 } })
    const { data: page2 } = await client.profiles({ id: aliceProfileId }).posts.get({ query: { size: 1, offset: 1 } })
    if (page1!.total > 1) {
      expect(page1!.items[0]!.postId).not.toBe(page2!.items[0]?.postId)
    }
  })
})

describe('GET /profiles/me', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles.me.get()
    expect(error?.status).toBe(401)
  })

  it('returns the profiles belonging to the logged-in user', async () => {
    const { data, error } = await client.profiles.me.get({ headers: { Cookie: aliceCookie } })
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    expect(data!.length).toBeGreaterThan(0)
    expect(data![0]!.name).toBe('Alice Johnson')
  })
})
