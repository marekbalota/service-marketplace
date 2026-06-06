import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { postsRoutes } from '.'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { authRoutes } from '../auth'
import { auth } from '../auth/service'
import { redis } from '../../lib/redis'

const app = new Elysia().use(authRoutes).use(usersRoutes).use(postsRoutes).use(profilesRoutes)
const client = treaty(app)

/** Extract postId from an Eden create-post response whose union type is hard to narrow. */
function getPostId(data: unknown): string {
  return (data as { postId: string }).postId
}

let sessionCookie = ''
let authorId = ''

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''

  const { data: meData } = await client.users.me.get({ headers: { Cookie: sessionCookie } })
  authorId = meData!.profiles[0]?.userProfileId ?? ''

  await redis.set('loc:R_slovakia', JSON.stringify({ country: 'Slovakia', region: 'Trenčín', city: 'Trenčín', street: null }), 'EX', 14400)
  await redis.set('loc:R_brno', JSON.stringify({ country: 'Czech Republic', region: 'South Moravian', city: 'Brno', street: null }), 'EX', 14400)
  await redis.set('loc:R_brno_street', JSON.stringify({ country: 'CZ', region: 'South Moravian Region', city: 'Brno', street: 'Botanická' }), 'EX', 14400)
  await redis.set('loc:R_brno2', JSON.stringify({ country: 'CZ', region: 'South Moravian', city: 'Brno', street: null }), 'EX', 14400)
  // Region-level place_id: city is null so the filter will use regionExternalId matching
  await redis.set('loc:R_south_moravia', JSON.stringify({ country: 'Czech Republic', region: 'South Moravian Region', city: null, street: null }), 'EX', 14400)
  // City-level place_id used as parent for the street-level post below
  await redis.set('loc:R_brno_city', JSON.stringify({ country: 'CZ', region: 'South Moravian Region', city: 'Brno', street: null }), 'EX', 14400)
  // Parent city caches so resolveParentPlaceId returns the right ID without hitting Geoapify
  await redis.set('parent:city:Trenčín:Slovakia', 'R_slovakia', 'EX', 86400)
  await redis.set('parent:city:Brno:Czech Republic', 'R_brno', 'EX', 86400)
  await redis.set('parent:city:Brno:CZ', 'R_brno_city', 'EX', 86400)

  await client.posts.post(
    { authorId, postTitle: 'Location test post Slovakia Trencin', description: 'Test post for location filter with known location data', postType: 'OFFER', location: { externalId: 'R_slovakia' } },
    { headers: { Cookie: sessionCookie } },
  )
  await client.posts.post(
    { authorId, postTitle: 'Location test post Czech Republic Brno', description: 'Test post for location filter with known location data', postType: 'OFFER', location: { externalId: 'R_brno' } },
    { headers: { Cookie: sessionCookie } },
  )
  // Post whose location row has region_external_id = 'R_south_moravia' — used in region-level filter test.
  // We set the parent cache entry so resolveParentPlaceId returns 'R_south_moravia' when the Brno
  // post is created (the english cache for 'R_brno3' stores region='South Moravian Region').
  await redis.set('parent:region:South Moravian Region:Czech Republic', 'R_south_moravia', 'EX', 86400)
  await redis.set('loc:R_brno3', JSON.stringify({ country: 'Czech Republic', region: 'South Moravian Region', city: 'Brno', street: null }), 'EX', 14400)
  await client.posts.post(
    { authorId, postTitle: 'Location test post Brno with region id', description: 'Test post for region-level location filter', postType: 'OFFER', location: { externalId: 'R_brno3' } },
    { headers: { Cookie: sessionCookie } },
  )
  // Post with street-level location — streetExternalId='R_brno_street', cityExternalId='R_brno_city'
  await client.posts.post(
    { authorId, postTitle: 'Location test post Brno street level', description: 'Test post for street-level location city filter', postType: 'OFFER', location: { externalId: 'R_brno_street' } },
    { headers: { Cookie: sessionCookie } },
  )
})

describe('GET /posts', () => {
  it('returns 200 with items, total, and totalPages', async () => {
    const { data, error } = await client.posts.get()
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
    expect(typeof data!.total).toBe('number')
    expect(typeof data!.totalPages).toBe('number')
  })

  it('each item has required fields', async () => {
    const { data } = await client.posts.get({ query: { size: 5 } })
    for (const item of data!.items) {
      expect(typeof item.postId).toBe('string')
      expect(typeof item.postTitle).toBe('string')
      expect(typeof item.description).toBe('string')
      expect(['OFFER', 'REQUEST']).toContain(item.postType)
      expect(typeof item.authorName).toBe('string')
      expect(Array.isArray(item.categories)).toBe(true)
    }
  })

  it('size param limits number of returned items', async () => {
    const { data } = await client.posts.get({ query: { size: 3 } })
    expect(data!.items.length).toBeLessThanOrEqual(3)
  })

  it('filters by type=OFFER — all items are OFFER', async () => {
    const { data } = await client.posts.get({ query: { type: 'OFFER' } })
    for (const item of data!.items) {
      expect(item.postType).toBe('OFFER')
    }
  })

  it('filters by type=REQUEST — all items are REQUEST', async () => {
    const { data } = await client.posts.get({ query: { type: 'REQUEST' } })
    for (const item of data!.items) {
      expect(item.postType).toBe('REQUEST')
    }
  })

  it('returns 422 for an invalid type value', async () => {
    const { error } = await client.posts.get({ query: { type: 'INVALID' as any } })
    expect(error?.status).toBe(422)
  })

  it('offset paginates correctly', async () => {
    const { data: page1 } = await client.posts.get({ query: { size: 2, offset: 0 } })
    const { data: page2 } = await client.posts.get({ query: { size: 2, offset: 2 } })

    if (page1!.total > 2) {
      const ids1 = page1!.items.map((p) => p.postId)
      const ids2 = page2!.items.map((p) => p.postId)
      expect(ids1).not.toEqual(ids2)
    }
  })

  it('totalPages is ceil(total / size)', async () => {
    const { data } = await client.posts.get({ query: { size: 5 } })
    const expected = Math.ceil(data!.total / 5)
    expect(data!.totalPages).toBe(expected)
  })

  it('search filters by title or description', async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } })
    if (!all || all.items.length === 0) return

    const firstWord = all.items[0]!.postTitle.split(' ')[0]!
    const { data, error } = await client.posts.get({ query: { search: firstWord } })
    expect(error).toBeNull()
    expect(data!.items.length).toBeGreaterThan(0)
  })
})

describe('GET /posts/:id', () => {
  it('returns 404 for unknown id', async () => {
    const { error } = await client.posts({ id: '00000000-0000-0000-0000-000000000000' }).get()
    expect(error?.status).toBe(404)
  })

  it('returns a post with all fields for a known id', async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } })
    if (!all || all.items.length === 0) return

    const postId = all.items[0]!.postId
    const { data, error } = await client.posts({ id: postId }).get()
    expect(error).toBeNull()
    expect(data!.postId).toBe(postId)
    expect(typeof data!.authorName).toBe('string')
    expect(Array.isArray(data!.categories)).toBe(true)
  })

  it('response includes location, reviews, reviewCount, and averageRating', async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } })
    if (!all || all.items.length === 0) return

    const postId = all.items[0]!.postId
    const { data } = await client.posts({ id: postId }).get()
    expect(data!.location === null || typeof data!.location === 'object').toBe(true)
    expect(Array.isArray(data!.reviews)).toBe(true)
    expect(typeof data!.reviewCount).toBe('number')
    expect(data!.averageRating === null || typeof data!.averageRating === 'number').toBe(true)
  })

  it('each review has reviewerName as string, and averageRating is between 1-5 when reviews exist', async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } })
    if (!all || all.items.length === 0) return

    const postId = all.items[0]!.postId
    const { data } = await client.posts({ id: postId }).get()

    if (data!.reviewCount > 0) {
      for (const review of data!.reviews) {
        expect(typeof review.reviewerName).toBe('string')
        expect(review.rating).toBeGreaterThanOrEqual(1)
        expect(review.rating).toBeLessThanOrEqual(5)
      }
      expect(data!.averageRating).not.toBeNull()
      expect(data!.averageRating!).toBeGreaterThanOrEqual(1)
      expect(data!.averageRating!).toBeLessThanOrEqual(5)
    }
  })
})

describe('POST /posts', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.posts.post({
      authorId,
      postTitle: 'Test post title',
      description: 'Test description with enough length',
      postType: 'OFFER',
    })
    expect(error?.status).toBe(401)
  })

  it('creates a post and returns 201', async () => {
    const { data, error } = await client.posts.post(
      {
        authorId,
        postTitle: 'Test post title',
        description: 'Test description with enough length',
        postType: 'OFFER',
      },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    expect(typeof data?.postId).toBe('string')
    expect(data?.postTitle).toBe('Test post title')
  })

  it('returns 422 when postTitle is too short', async () => {
    const { error } = await client.posts.post(
      {
        authorId,
        postTitle: 'Hi',
        description: 'Description with enough length',
        postType: 'OFFER',
      },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('creates a post with a new location object', async () => {
    const { data, error } = await client.posts.post(
      {
        authorId,
        postTitle: 'Post with new location',
        description: 'Test description with enough length',
        postType: 'REQUEST',
        location: { externalId: 'R_brno_street' },
      },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    expect(typeof getPostId(data)).toBe('string')
  })

  it('creates a post with an existing locationId', async () => {
    const { data: created } = await client.posts.post(
      {
        authorId,
        postTitle: 'Seed post for location reuse',
        description: 'Test description with enough length',
        postType: 'OFFER',
        location: { externalId: 'R_brno2' },
      },
      { headers: { Cookie: sessionCookie } },
    )
    const seedPostId = getPostId(created)
    const { data: fetchedPost } = await client.posts({ id: seedPostId }).get()
    const existingLocationId = fetchedPost?.location?.locationId
    expect(existingLocationId).toBeDefined()

    const { data, error } = await client.posts.post(
      {
        authorId,
        postTitle: 'Post reusing location',
        description: 'Test description with enough length',
        postType: 'OFFER',
        locationId: existingLocationId,
      },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    expect(typeof getPostId(data)).toBe('string')
  })

  it('returns 403 when authorId does not belong to session user', async () => {
    const { error } = await client.posts.post(
      {
        authorId: '00000000-0000-0000-0000-000000000000',
        postTitle: 'Test post title',
        description: 'Test description with enough length',
        postType: 'OFFER',
      },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error?.status).toBe(403)
  })
})

describe('PATCH /posts/:id', () => {
  it('returns 401 without a session', async () => {
    const { data: all } = await client.posts.get({ query: { size: 1 } })
    if (!all || all.items.length === 0) return

    const postId = all.items[0]!.postId
    const { error } = await client.posts({ id: postId }).patch({
      postTitle: 'Updated title',
    })
    expect(error?.status).toBe(401)
  })

  it('returns 404 for unknown id with session', async () => {
    const { error } = await client
      .posts({ id: '00000000-0000-0000-0000-000000000000' })
      .patch({ postTitle: 'Updated title' }, { headers: { Cookie: sessionCookie } })
    expect(error?.status).toBe(404)
  })

  it('updates own post and returns 204', async () => {
    const { data: created } = await client.posts.post(
      {
        authorId,
        postTitle: 'Post to be updated',
        description: 'Original description with enough length',
        postType: 'OFFER',
      },
      { headers: { Cookie: sessionCookie } },
    )
    const postId = getPostId(created)

    const { error } = await client
      .posts({ id: postId })
      .patch(
        { postTitle: 'Updated post title', description: 'Updated description with enough length' },
        { headers: { Cookie: sessionCookie } },
      )
    expect(error).toBeNull()

    const { data: fetched } = await client.posts({ id: postId }).get()
    expect(fetched!.postTitle).toBe('Updated post title')
    expect(fetched!.description).toBe('Updated description with enough length')
  })

  it('returns 403 when updating a post not owned by the session user', async () => {
    const { data: created } = await client.posts.post(
      {
        authorId,
        postTitle: 'Post owned by alice',
        description: 'This post belongs to alice and should not be editable by others',
        postType: 'OFFER',
      },
      { headers: { Cookie: sessionCookie } },
    )
    const postId = getPostId(created)

    // Sign in as a different user to attempt the update
    const otherSignInRes = await auth.api.signInEmail({
      body: { email: 'bob@example.com', password: 'password123' },
      asResponse: true,
    })
    const otherCookie = otherSignInRes.headers.get('set-cookie') ?? ''

    if (!otherCookie) return // bob may not exist in seed data

    const { error } = await client
      .posts({ id: postId })
      .patch({ postTitle: 'Attempted hijack' }, { headers: { Cookie: otherCookie } })
    expect(error?.status).toBe(403)
  })

  it('updates post location via externalId', async () => {
    await redis.set('loc:R_update', JSON.stringify({ country: 'Czech Republic', region: 'Prague', city: 'Prague', street: null }), 'EX', 14400)

    // First create a post to update
    const { data: created } = await client.posts.post(
      { authorId, postTitle: 'Location update test', description: 'Testing location update', postType: 'OFFER' },
      { headers: { Cookie: sessionCookie } },
    )
    const postId = getPostId(created)

    const { error } = await client.posts({ id: postId }).patch(
      { location: { externalId: 'R_update' } },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    // Verify the post now has a location by fetching it
    const { data: fetched } = await client.posts({ id: postId }).get()
    expect(fetched!.location?.city).toBe('Prague')
  })

  it('returns 422 when update location externalId not in Redis', async () => {
    const { data: created } = await client.posts.post(
      { authorId, postTitle: 'Location 422 test', description: 'Testing location 422', postType: 'OFFER' },
      { headers: { Cookie: sessionCookie } },
    )
    const postId = getPostId(created)

    const { error } = await client.posts({ id: postId }).patch(
      { location: { externalId: 'R_nonexistent_cache_miss' } },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('returns 422 when locationId is an empty string', async () => {
    const { data: created } = await client.posts.post(
      { authorId, postTitle: 'Empty locationId test', description: 'Testing empty locationId', postType: 'OFFER' },
      { headers: { Cookie: sessionCookie } },
    )
    const postId = getPostId(created)

    const { error } = await client.posts({ id: postId }).patch(
      { locationId: '' as never },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('clears post location when locationId is null', async () => {
    await redis.set('loc:R_clear', JSON.stringify({ country: 'Germany', region: 'Bavaria', city: 'Munich', street: null }), 'EX', 14400)

    const { data: created } = await client.posts.post(
      { authorId, postTitle: 'Location clear test', description: 'Testing location clear', postType: 'OFFER', location: { externalId: 'R_clear' } },
      { headers: { Cookie: sessionCookie } },
    )
    const postId = getPostId(created)

    const { error } = await client.posts({ id: postId }).patch(
      { locationId: null },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    const { data: fetched } = await client.posts({ id: postId }).get()
    expect(fetched!.location).toBeNull()
  })
})

describe('DELETE /posts/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.posts({ id: '00000000-0000-0000-0000-000000000000' }).delete()
    expect(error?.status).toBe(401)
  })

  it('soft-deletes own post and returns 204', async () => {
    const { data: created } = await client.posts.post(
      {
        authorId,
        postTitle: 'Post to be deleted',
        description: 'This post will be soft-deleted in test',
        postType: 'REQUEST',
      },
      { headers: { Cookie: sessionCookie } },
    )
    const postId = created?.postId ?? ''

    const { error } = await client.posts({ id: postId }).delete(undefined, {
      headers: { Cookie: sessionCookie },
    })
    expect(error).toBeNull()

    const { error: getError } = await client.posts({ id: postId }).get()
    expect(getError?.status).toBe(404)
  })

  it("returns 403 when trying to delete another user's post", async () => {
    // Create a post as alice
    const { data: created } = await client.posts.post(
      {
        authorId,
        postTitle: 'Alice post for 403 test',
        description: 'This post belongs to alice and bob cannot delete it',
        postType: 'OFFER',
      },
      { headers: { Cookie: sessionCookie } },
    )
    const postId = getPostId(created)

    // Sign in as bob using Eden Treaty client
    const bobSignInRes = await auth.api.signInEmail({
      body: { email: 'bob@example.com', password: 'password123' },
      asResponse: true,
    })
    const bobCookie = bobSignInRes.headers.get('set-cookie') ?? ''
    if (!bobCookie) return

    const { error } = await client.posts({ id: postId }).delete(undefined, {
      headers: { Cookie: bobCookie },
    })
    expect(error?.status).toBe(403)
  })
})

describe('GET /posts — categoryIds filter', () => {
  it('filters by a single categoryId — every result contains that category', async () => {
    const { data: all } = await client.posts.get({ query: { size: 50 } })
    const postWithCat = all!.items.find((p) => p.categories.length > 0)
    if (!postWithCat) return // no seeded posts with categories — skip

    const catId = postWithCat.categories[0]!.categoryId
    const { data, error } = await client.posts.get({ query: { categoryIds: [catId] } })

    expect(error).toBeNull()
    expect(data!.items.length).toBeGreaterThan(0)
    for (const item of data!.items) {
      expect(item.categories.some((c) => c.categoryId === catId)).toBe(true)
    }
  })

  it('filters by two categoryIds — every result contains at least one', async () => {
    const { data: all } = await client.posts.get({ query: { size: 50 } })
    const withCats = all!.items.filter((p) => p.categories.length > 0)
    if (withCats.length < 1) return // not enough seeded data — skip

    const catId1 = withCats[0]!.categories[0]!.categoryId
    const secondPost = withCats.find((p) => !p.categories.some((c) => c.categoryId === catId1))
    const catId2 = (secondPost ?? withCats[0]!).categories[0]!.categoryId

    const { data, error } = await client.posts.get({
      query: { categoryIds: [catId1, catId2] },
    })

    expect(error).toBeNull()
    for (const item of data!.items) {
      const ids = item.categories.map((c) => c.categoryId)
      expect(ids.includes(catId1) || ids.includes(catId2)).toBe(true)
    }
  })

  it('returns all posts when no categoryIds are sent', async () => {
    const { data: all } = await client.posts.get({ query: { size: 50 } })
    const { data: unfiltered } = await client.posts.get({})
    expect(all!.total).toBe(unfiltered!.total)
  })
})

describe('GET /posts — location filter', () => {
  it('filters by externalId — only posts with matching location are returned', async () => {
    const { data, error } = await client.posts.get({ query: { externalId: 'R_slovakia' } })
    expect(error).toBeNull()
    expect(data!.total).toBeGreaterThan(0)
    for (const item of data!.items) {
      expect(item.location).not.toBeNull()
    }
  })

  it('different externalIds return different post sets', async () => {
    const { data: slovakia } = await client.posts.get({ query: { externalId: 'R_slovakia' } })
    const { data: brno } = await client.posts.get({ query: { externalId: 'R_brno' } })
    const slovakiaIds = new Set(slovakia!.items.map((p) => p.postId))
    for (const item of brno!.items) {
      expect(slovakiaIds.has(item.postId)).toBe(false)
    }
  })

  it('returns empty items for an externalId that has no posts', async () => {
    const { data, error } = await client.posts.get({
      query: { externalId: 'R_nonexistent_xyz' },
    })
    expect(error).toBeNull()
    expect(data!.items).toHaveLength(0)
    expect(data!.total).toBe(0)
  })

  it('region-level externalId returns all posts whose location has that regionExternalId', async () => {
    // R_south_moravia has city=null so filter uses eq(locations.regionExternalId, 'R_south_moravia')
    // The post created with R_brno3 has region_external_id='R_south_moravia' (set via Redis parent cache)
    const { data, error } = await client.posts.get({ query: { externalId: 'R_south_moravia' } })
    expect(error).toBeNull()
    expect(data!.total).toBeGreaterThan(0)
    for (const item of data!.items) {
      expect(item.location).not.toBeNull()
    }
  })

  it('city-level externalId returns street-level posts in that city via cityExternalId', async () => {
    // R_brno_city has city='Brno', street=null — filter uses or(externalId, cityExternalId)
    // The post created with R_brno_street has city_external_id='R_brno_city' (set via Redis parent cache)
    const { data, error } = await client.posts.get({ query: { externalId: 'R_brno_city' } })
    expect(error).toBeNull()
    const streetPost = data!.items.find((p) => p.postTitle === 'Location test post Brno street level')
    expect(streetPost).toBeDefined()
    expect(streetPost!.location).not.toBeNull()
  })
})

describe('GET /posts — locale-aware category names', () => {
  it('returns Slovak category name when Accept-Language is sk', async () => {
    const { data: en } = await client.posts.get({ query: { size: 50 } })
    const postWithTutoring = en!.items.find((p) => p.categories.some((c) => c.name === 'Tutoring'))
    if (!postWithTutoring) return // seeded post not found — skip

    const tutoringId = postWithTutoring.categories.find((c) => c.name === 'Tutoring')!.categoryId
    const { data: sk } = await client.posts.get({
      query: { size: 50 },
      headers: { 'accept-language': 'sk' },
    })
    const skPost = sk!.items.find((p) => p.postId === postWithTutoring.postId)
    expect(skPost?.categories.find((c) => c.categoryId === tutoringId)?.name).toBe('Doučovanie')
  })

  it('falls back to EN category name for unsupported locale', async () => {
    const { data: en } = await client.posts.get({ query: { size: 50 } })
    const postWithTutoring = en!.items.find((p) => p.categories.some((c) => c.name === 'Tutoring'))
    if (!postWithTutoring) return // seeded post not found — skip

    const tutoringId = postWithTutoring.categories.find((c) => c.name === 'Tutoring')!.categoryId
    const { data: de } = await client.posts.get({
      query: { size: 50 },
      headers: { 'accept-language': 'de' },
    })
    const dePost = de!.items.find((p) => p.postId === postWithTutoring.postId)
    expect(dePost?.categories.find((c) => c.categoryId === tutoringId)?.name).toBe('Tutoring')
  })
})

describe('GET /posts/:id — locale-aware category names', () => {
  it('returns Slovak category name when Accept-Language is sk', async () => {
    const { data: en } = await client.posts.get({ query: { size: 50 } })
    const postWithTutoring = en!.items.find((p) => p.categories.some((c) => c.name === 'Tutoring'))
    if (!postWithTutoring) return // seeded post not found — skip

    const tutoringId = postWithTutoring.categories.find((c) => c.name === 'Tutoring')!.categoryId
    const { data } = await client.posts({ id: postWithTutoring.postId }).get({
      headers: { 'accept-language': 'sk' },
    })
    expect(data!.categories.find((c) => c.categoryId === tutoringId)?.name).toBe('Doučovanie')
  })
})
