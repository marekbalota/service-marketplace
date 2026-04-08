import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { postsRoutes } from './posts'

const app = new Elysia().use(postsRoutes)

type PostsResponse = {
  items: {
    postId: string
    postTitle: string
    description: string
    postType: string
    price: string | null
    rateType: string | null
    createdAt: string
    authorName: string
    categories: { categoryId: string; name: string }[]
  }[]
  total: number
  totalPages: number
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
    // First get all posts to find a real title to search for
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
