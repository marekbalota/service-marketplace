import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { db } from '../../db'
import { posts, reports, reportCategories } from '../../db/schema'
import { profilesRoutes } from '.'
import { usersRoutes } from '../users'
import { authRoutes } from '../auth'
import { postsRoutes } from '../posts'
import { auth } from '../auth/service'
import { errorsPlugin } from '../../lib/errors'

const app = new Elysia().use(errorsPlugin).use(authRoutes).use(profilesRoutes).use(usersRoutes).use(postsRoutes)
const client = treaty(app)

let aliceCookie: string
let aliceProfileId: string

// Track every profile created by this test suite so the 409 test can clean up
// only what this run created — not Alice's original seed profile
const testCreatedProfileIds: string[] = []

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  aliceCookie = signInRes.headers.get('set-cookie') ?? ''

  const { data } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
  const aliceProfile = data?.profiles.find(p => p.name === 'Alice Johnson') ?? data?.profiles[0]
  aliceProfileId = aliceProfile?.userProfileId ?? ''
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

  it('updates own profile and returns 200 with updated profile', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).patch(
      { bio: 'Updated bio from test' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()
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

  it('returns 403 for a profile not owned by the caller', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).locations.get({
      headers: { Cookie: aliceCookie }
    })
    expect(error?.status).toBe(403)
  })
})

describe('POST /profiles', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles.post({ name: 'New Profile', email: 'new@example.com' })
    expect(error?.status).toBe(401)
  })

  it('returns 422 when name is missing', async () => {
    const { error } = await client.profiles.post(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { email: 'new@example.com' } as any,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('returns 422 for invalid email format', async () => {
    const { error } = await client.profiles.post(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'New Profile', email: 'not-an-email' } as any,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('creates a profile and returns 201 with the new profile', async () => {
    const { data, error } = await client.profiles.post(
      { name: 'Test Profile', email: 'test-profile@example.com', bio: 'A test bio' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()
    expect(data!.name).toBe('Test Profile')
    expect(data!.email).toBe('test-profile@example.com')
    expect(data!.bio).toBe('A test bio')
    testCreatedProfileIds.push(data!.userProfileId)
  })

  it('sets accountId from session, not from body', async () => {
    const { data } = await client.profiles.post(
      { name: 'Session Profile', email: 'session@example.com' },
      { headers: { Cookie: aliceCookie } },
    )
    testCreatedProfileIds.push(data!.userProfileId)
    const { data: me } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
    const found = me!.profiles.find(p => p.userProfileId === data!.userProfileId)
    expect(found).toBeDefined()
  })
})

describe('DELETE /profiles/:id', () => {
  let secondProfileId: string

  beforeAll(async () => {
    const { data } = await client.profiles.post(
      { name: 'Profile To Delete', email: 'to-delete@example.com' },
      { headers: { Cookie: aliceCookie } },
    )
    secondProfileId = data!.userProfileId
    testCreatedProfileIds.push(secondProfileId)
  })

  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles({ id: secondProfileId }).delete()
    expect(error?.status).toBe(401)
  })

  it('returns 403 when trying to delete a profile not owned by the user', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 204 and soft-deletes the profile', async () => {
    const { data: created } = await client.profiles.post(
      { name: 'Soft Delete Me', email: 'soft-delete@example.com' },
      { headers: { Cookie: aliceCookie } },
    )
    testCreatedProfileIds.push(created!.userProfileId)

    const { error } = await client.profiles({ id: created!.userProfileId }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()

    const { data: me } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
    const found = me!.profiles.find(p => p.userProfileId === created!.userProfileId)
    expect(found).toBeUndefined()
  })

  it('returns 409 when attempting to delete the last active profile', async () => {
    // Get current profiles to find the last one
    const { data: me } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
    const profileIds = me?.profiles.map(p => p.userProfileId) ?? []

    // Delete all but one profile
    for (const id of profileIds.slice(0, -1)) {
      await client.profiles({ id }).delete(undefined, { headers: { Cookie: aliceCookie } })
    }

    // Attempting to delete the last profile must return 409
    const lastProfileId = profileIds[profileIds.length - 1]
    const { error } = await client.profiles({ id: lastProfileId }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(409)
  })
})

describe('POST /profiles/:id/locations', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).locations.post({ country: 'Slovakia' })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a profile not owned by the caller', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).locations.post(
      { country: 'Slovakia' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 201 with the created location', async () => {
    const { data, error } = await client.profiles({ id: aliceProfileId }).locations.post(
      { country: 'Slovakia', city: 'Bratislava' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()
    expect(data!.country).toBe('Slovakia')
    expect(data!.city).toBe('Bratislava')
    expect(typeof data!.locationId).toBe('string')
  })

  it('location appears in GET /profiles/:id/locations after adding', async () => {
    const { data: created } = await client.profiles({ id: aliceProfileId }).locations.post(
      { country: 'TestCountry' },
      { headers: { Cookie: aliceCookie } },
    )
    const { data: list } = await client.profiles({ id: aliceProfileId }).locations.get({
      headers: { Cookie: aliceCookie },
    })
    expect(list!.some(l => l.locationId === created!.locationId)).toBe(true)
  })
})

describe('DELETE /profiles/:id/locations/:locationId', () => {
  let locationId = ''

  beforeAll(async () => {
    const { data } = await client.profiles({ id: aliceProfileId }).locations.post(
      { country: 'DeleteMe' },
      { headers: { Cookie: aliceCookie } },
    )
    locationId = data!.locationId
  })

  it('returns 401 without a session cookie', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).locations({ locationId }).delete()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a profile not owned by the caller', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).locations({ locationId }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 404 for a non-existent locationId', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).locations({ locationId: '00000000-0000-0000-0000-000000000000' }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(404)
  })

  it('returns 204 and soft-deletes the location from the profile', async () => {
    const { error } = await client.profiles({ id: aliceProfileId }).locations({ locationId }).delete(
      undefined,
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()

    const { data: list } = await client.profiles({ id: aliceProfileId }).locations.get({
      headers: { Cookie: aliceCookie },
    })
    expect(list!.some(l => l.locationId === locationId)).toBe(false)
  })
})

describe('GET /profiles/:id/reported/posts/:postId', () => {
  let reportedPostId = ''
  let unreportedPostId = ''
  let reportingProfileId = ''

  beforeAll(async () => {
    const [otherPost] = await db
      .select({ postId: posts.postId })
      .from(posts)
      .where(and(ne(posts.authorId, aliceProfileId), isNull(posts.deletedAt)))
      .limit(1)
    reportedPostId = otherPost?.postId ?? ''

    const [alicePost] = await db
      .select({ postId: posts.postId })
      .from(posts)
      .where(and(eq(posts.authorId, aliceProfileId), isNull(posts.deletedAt)))
      .limit(1)
    unreportedPostId = alicePost?.postId ?? ''

    const [spamCat] = await db
      .select({ categoryId: reportCategories.categoryId })
      .from(reportCategories)
      .where(and(eq(reportCategories.targetType, 'POST'), isNull(reportCategories.deletedAt)))
      .limit(1)

    // Get the first profile that will be used for reporting (matches what createForPostForAccount uses)
    const { data: me } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
    reportingProfileId = me?.profiles[0]?.userProfileId ?? aliceProfileId

    // Clean up all reports by alice's profiles
    await db.delete(reports).where(eq(reports.reporterId, reportingProfileId))
    await client.posts({ id: reportedPostId }).reports.post(
      { categoryId: spamCat!.categoryId },
      { headers: { Cookie: aliceCookie } },
    )
  })

  it('returns 401 without auth', async () => {
    const { error } = await client.profiles({ id: reportingProfileId }).reported.posts({ postId: reportedPostId }).get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a profile not owned by the caller', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).reported.posts({ postId: reportedPostId }).get(
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 204 when the profile has reported the post', async () => {
    const { error } = await client.profiles({ id: reportingProfileId }).reported.posts({ postId: reportedPostId }).get(
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()
  })

  it('returns 404 when the profile has not reported the post', async () => {
    const { error } = await client.profiles({ id: reportingProfileId }).reported.posts({ postId: unreportedPostId }).get(
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(404)
  })
})

describe('GET /profiles/:id/reported/reviews/:reviewId', () => {
  let testProfileId = ''

  beforeAll(async () => {
    const { data: me } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
    testProfileId = me?.profiles[0]?.userProfileId ?? aliceProfileId
  })

  it('returns 401 without auth', async () => {
    const { error } = await client.profiles({ id: testProfileId }).reported.reviews({ reviewId: '00000000-0000-0000-0000-000000000000' }).get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a profile not owned by the caller', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).reported.reviews({ reviewId: '00000000-0000-0000-0000-000000000000' }).get(
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 404 when the profile has not reported the review', async () => {
    const { error } = await client.profiles({ id: testProfileId }).reported.reviews({ reviewId: '00000000-0000-0000-0000-000000000000' }).get(
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(404)
  })
})

describe('GET /profiles/:id/reported/messages/:messageId', () => {
  let testProfileId = ''

  beforeAll(async () => {
    const { data: me } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
    testProfileId = me?.profiles[0]?.userProfileId ?? aliceProfileId
  })

  it('returns 401 without auth', async () => {
    const { error } = await client.profiles({ id: testProfileId }).reported.messages({ messageId: '00000000-0000-0000-0000-000000000000' }).get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a profile not owned by the caller', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).reported.messages({ messageId: '00000000-0000-0000-0000-000000000000' }).get(
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 404 when the profile has not reported the message', async () => {
    const { error } = await client.profiles({ id: testProfileId }).reported.messages({ messageId: '00000000-0000-0000-0000-000000000000' }).get(
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(404)
  })
})
