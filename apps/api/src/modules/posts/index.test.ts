import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { postsRoutes } from '.'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { authRoutes } from '../auth'
import { auth } from '../auth/service'

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
        location: {
          country: 'CZ',
          region: 'South Moravian Region',
          city: 'Brno',
          street: 'Botanická',
          houseNumber: '68a',
        },
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
        location: { country: 'CZ', region: 'South Moravian', city: 'Brno' },
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
  it('filters by country — all returned items have a matching location', async () => {
    const { data, error } = await client.posts.get({ query: { country: 'Slovakia' } })
    expect(error).toBeNull()
    // All items must have a location with country = Slovakia
    // (posts without location are excluded by the SQL WHERE condition)
    for (const item of data!.items) {
      expect(item.location).not.toBeNull()
      expect(item.location!.country).toBe('Slovakia')
    }
  })

  it('case-insensitive: country=slovakia matches country=Slovakia', async () => {
    const { data: lower } = await client.posts.get({ query: { country: 'slovakia' } })
    const { data: exact } = await client.posts.get({ query: { country: 'Slovakia' } })
    expect(lower!.total).toBe(exact!.total)
  })

  it('combined country + city filter narrows results', async () => {
    const { data: countryOnly } = await client.posts.get({ query: { country: 'Slovakia' } })
    const { data: withCity } = await client.posts.get({
      query: { country: 'Slovakia', city: 'Trenčín' },
    })

    if (countryOnly!.total === 0) return // no seeded Slovak posts — skip
    expect(withCity!.total).toBeLessThanOrEqual(countryOnly!.total)
  })

  it('returns empty items for a country that has no posts', async () => {
    const { data, error } = await client.posts.get({
      query: { country: 'Nonexistent Country XYZ' },
    })
    expect(error).toBeNull()
    expect(data!.items).toHaveLength(0)
    expect(data!.total).toBe(0)
  })

  it('diacritic-insensitive: city=Trencin matches city=Trenčín', async () => {
    const { data: accent } = await client.posts.get({
      query: { country: 'Slovakia', city: 'Trenčín' },
    })
    const { data: noAccent } = await client.posts.get({
      query: { country: 'Slovakia', city: 'Trencin' },
    })
    expect(noAccent!.total).toBe(accent!.total)
  })
})

describe('GET /posts — locale-aware category names', () => {
  it('returns Slovak category name when Accept-Language is sk', async () => {
    const { data: en } = await client.posts.get({ query: { size: 50 } })
    const postWithTutoring = en!.items.find((p) =>
      p.categories.some((c) => c.name === 'Tutoring'),
    )
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
    const postWithTutoring = en!.items.find((p) =>
      p.categories.some((c) => c.name === 'Tutoring'),
    )
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
    const postWithTutoring = en!.items.find((p) =>
      p.categories.some((c) => c.name === 'Tutoring'),
    )
    if (!postWithTutoring) return // seeded post not found — skip

    const tutoringId = postWithTutoring.categories.find((c) => c.name === 'Tutoring')!.categoryId
    const { data } = await client.posts({ id: postWithTutoring.postId }).get({
      headers: { 'accept-language': 'sk' },
    })
    expect(data!.categories.find((c) => c.categoryId === tutoringId)?.name).toBe('Doučovanie')
  })
})
