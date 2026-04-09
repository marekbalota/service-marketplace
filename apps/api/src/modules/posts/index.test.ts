import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { postsRoutes } from '.'
import { profilesRoutes } from '../profiles'

const app = new Elysia().use(postsRoutes)
const profilesApp = new Elysia().use(profilesRoutes)

type PostItem = {
  postId: string
  postTitle: string
  description: string
  postType: string
  price: string | null
  rateType: string | null
  createdAt: string
  authorId: string
  authorName: string
  categories: { categoryId: string; name: string }[]
}

type PostDetailItem = PostItem & {
  locations: { locationId: string; country: string | null; region: string | null; city: string | null; street: string | null; houseNumber: string | null }[]
  reviews: { reviewId: string; rating: number; reviewDescription: string | null; reviewerName: string; createdAt: string }[]
  averageRating: number | null
  reviewCount: number
}

type PostRow = {
  postId: string
  authorId: string
  postTitle: string
  description: string
  postType: string
  price: string | null
  rateType: string | null
  createdAt: string
}

type PostsResponse = {
  items: PostItem[]
  total: number
  totalPages: number
}

// Seed helper — returns a valid authorId from existing profiles
async function getAuthorId(): Promise<string | null> {
  const res = await profilesApp.handle(new Request('http://localhost/profiles'))
  if (!res.ok) return null
  const profiles = await res.json() as { userProfileId: string }[]
  return profiles[0]?.userProfileId ?? null
}

describe('GET /posts', () => {
  it('returns 200', async () => {
    const res = await app.handle(new Request('http://localhost/posts'))
    expect(res.status).toBe(200)
  })

  it('returns items, total, and totalPages', async () => {
    const res = await app.handle(new Request('http://localhost/posts'))
    const body = await res.json() as PostsResponse
    expect(Array.isArray(body.items)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(typeof body.totalPages).toBe('number')
  })

  it('each item has required fields', async () => {
    const res = await app.handle(new Request('http://localhost/posts?size=5'))
    const body = await res.json() as PostsResponse
    for (const item of body.items) {
      expect(typeof item.postId).toBe('string')
      expect(typeof item.postTitle).toBe('string')
      expect(typeof item.description).toBe('string')
      expect(['OFFER', 'REQUEST']).toContain(item.postType)
      expect(typeof item.authorName).toBe('string')
      expect(Array.isArray(item.categories)).toBe(true)
    }
  })

  it('size param limits number of returned items', async () => {
    const res = await app.handle(new Request('http://localhost/posts?size=3'))
    const body = await res.json() as PostsResponse
    expect(body.items.length).toBeLessThanOrEqual(3)
  })

  it('filters by type=OFFER — all items are OFFER', async () => {
    const res = await app.handle(new Request('http://localhost/posts?type=OFFER'))
    const body = await res.json() as PostsResponse
    for (const item of body.items) {
      expect(item.postType).toBe('OFFER')
    }
  })

  it('filters by type=REQUEST — all items are REQUEST', async () => {
    const res = await app.handle(new Request('http://localhost/posts?type=REQUEST'))
    const body = await res.json() as PostsResponse
    for (const item of body.items) {
      expect(item.postType).toBe('REQUEST')
    }
  })

  it('returns 422 for an invalid type value', async () => {
    const res = await app.handle(new Request('http://localhost/posts?type=INVALID'))
    expect(res.status).toBe(422)
  })

  it('offset paginates correctly', async () => {
    const res1 = await app.handle(new Request('http://localhost/posts?size=2&offset=0'))
    const res2 = await app.handle(new Request('http://localhost/posts?size=2&offset=2'))
    const body1 = await res1.json() as PostsResponse
    const body2 = await res2.json() as PostsResponse

    if (body1.total > 2) {
      const ids1 = body1.items.map((p) => p.postId)
      const ids2 = body2.items.map((p) => p.postId)
      expect(ids1).not.toEqual(ids2)
    }
  })

  it('totalPages is ceil(total / size)', async () => {
    const res = await app.handle(new Request('http://localhost/posts?size=5'))
    const body = await res.json() as PostsResponse
    const expected = Math.ceil(body.total / 5)
    expect(body.totalPages).toBe(expected)
  })

  it('search filters by title or description', async () => {
    const allRes = await app.handle(new Request('http://localhost/posts?size=1'))
    const allBody = await allRes.json() as PostsResponse
    if (allBody.items.length === 0) return

    const firstWord = allBody.items[0]!.postTitle.split(' ')[0]!
    const searchRes = await app.handle(
      new Request(`http://localhost/posts?search=${encodeURIComponent(firstWord)}`),
    )
    expect(searchRes.status).toBe(200)
    const searchBody = await searchRes.json() as PostsResponse
    expect(searchBody.items.length).toBeGreaterThan(0)
  })
})

describe('GET /posts/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await app.handle(
      new Request('http://localhost/posts/00000000-0000-0000-0000-000000000000'),
    )
    expect(res.status).toBe(404)
  })

  it('returns a post with all fields for a known id', async () => {
    const allRes = await app.handle(new Request('http://localhost/posts?size=1'))
    const allBody = await allRes.json() as PostsResponse
    if (allBody.items.length === 0) return

    const res = await app.handle(
      new Request(`http://localhost/posts/${allBody.items[0]!.postId}`),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as PostItem
    expect(body.postId).toBe(allBody.items[0]!.postId)
    expect(typeof body.authorName).toBe('string')
    expect(Array.isArray(body.categories)).toBe(true)
  })

  it('response includes locations, reviews, reviewCount, and averageRating', async () => {
    const allRes = await app.handle(new Request('http://localhost/posts?size=1'))
    const allBody = await allRes.json() as PostsResponse
    if (allBody.items.length === 0) return

    const res = await app.handle(
      new Request(`http://localhost/posts/${allBody.items[0]!.postId}`),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as PostDetailItem
    expect(Array.isArray(body.locations)).toBe(true)
    expect(Array.isArray(body.reviews)).toBe(true)
    expect(typeof body.reviewCount).toBe('number')
    expect(body.averageRating === null || typeof body.averageRating === 'number').toBe(true)
  })

  it('each review has reviewerName as string, and averageRating is between 1-5 when reviews exist', async () => {
    const allRes = await app.handle(new Request('http://localhost/posts?size=1'))
    const allBody = await allRes.json() as PostsResponse
    if (allBody.items.length === 0) return

    const res = await app.handle(
      new Request(`http://localhost/posts/${allBody.items[0]!.postId}`),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as PostDetailItem

    if (body.reviewCount > 0) {
      for (const review of body.reviews) {
        expect(typeof review.reviewerName).toBe('string')
        expect(review.rating).toBeGreaterThanOrEqual(1)
        expect(review.rating).toBeLessThanOrEqual(5)
      }
      expect(body.averageRating).not.toBeNull()
      expect(body.averageRating!).toBeGreaterThanOrEqual(1)
      expect(body.averageRating!).toBeLessThanOrEqual(5)
    }
  })
})

describe('POST /posts', () => {
  it('creates a post and returns 201', async () => {
    const authorId = await getAuthorId()
    if (!authorId) return

    const res = await app.handle(
      new Request('http://localhost/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId,
          postTitle: 'Test post title',
          description: 'Test description with enough length',
          postType: 'OFFER',
        }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json() as PostRow
    expect(typeof body.postId).toBe('string')
    expect(body.postTitle).toBe('Test post title')
    expect(body.postType).toBe('OFFER')
  })

  it('returns 422 when postTitle is too short', async () => {
    const authorId = await getAuthorId()
    if (!authorId) return

    const res = await app.handle(
      new Request('http://localhost/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId,
          postTitle: 'Hi',
          description: 'Description with enough length',
          postType: 'OFFER',
        }),
      }),
    )
    expect(res.status).toBe(422)
  })

  it('returns 422 when required fields are missing', async () => {
    const res = await app.handle(
      new Request('http://localhost/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postTitle: 'Test post title' }),
      }),
    )
    expect(res.status).toBe(422)
  })
})

describe('PATCH /posts/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await app.handle(
      new Request('http://localhost/posts/00000000-0000-0000-0000-000000000000', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postTitle: 'Updated title' }),
      }),
    )
    expect(res.status).toBe(404)
  })

  it('updates a post and returns 200', async () => {
    const allRes = await app.handle(new Request('http://localhost/posts?size=1'))
    const allBody = await allRes.json() as PostsResponse
    if (allBody.items.length === 0) return

    const res = await app.handle(
      new Request(`http://localhost/posts/${allBody.items[0]!.postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postTitle: 'Updated title here' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as PostRow
    expect(body.postTitle).toBe('Updated title here')
  })

  it('returns 422 for invalid postType', async () => {
    const allRes = await app.handle(new Request('http://localhost/posts?size=1'))
    const allBody = await allRes.json() as PostsResponse
    if (allBody.items.length === 0) return

    const res = await app.handle(
      new Request(`http://localhost/posts/${allBody.items[0]!.postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postType: 'INVALID' }),
      }),
    )
    expect(res.status).toBe(422)
  })
})

describe('DELETE /posts/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await app.handle(
      new Request('http://localhost/posts/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
      }),
    )
    expect(res.status).toBe(404)
  })

  it('soft-deletes a post and returns 200', async () => {
    const authorId = await getAuthorId()
    if (!authorId) return

    // Create a throwaway post to delete
    const createRes = await app.handle(
      new Request('http://localhost/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId,
          postTitle: 'Post to be deleted',
          description: 'This post will be soft-deleted in test',
          postType: 'REQUEST',
        }),
      }),
    )
    const created = await createRes.json() as PostRow

    const deleteRes = await app.handle(
      new Request(`http://localhost/posts/${created.postId}`, { method: 'DELETE' }),
    )
    expect(deleteRes.status).toBe(200)

    // Confirm it no longer appears in the list
    const getRes = await app.handle(
      new Request(`http://localhost/posts/${created.postId}`),
    )
    expect(getRes.status).toBe(404)
  })
})
