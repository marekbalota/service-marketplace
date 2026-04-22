import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { reviewsRoutes } from '.'
import { postsRoutes } from '../posts'
import { authRoutes } from '../auth'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { categoriesRoutes } from '../categories'
import { errorsPlugin } from '../../lib/errors'

const app = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(postsRoutes)
  .use(reviewsRoutes)
  .use(profilesRoutes)
  .use(categoriesRoutes)

const client = treaty(app)

let sessionCookie = ''
let authorId = ''
let postId = ''
let reviewId = ''

beforeAll(async () => {
  // Sign in as test user
  const signInRes = await app.handle(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
    }),
  )
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''

  // Get user profile
  const meData = await (await app.handle(new Request('http://localhost/users/me', { headers: { Cookie: sessionCookie } }))).json() as { profiles: { userProfileId: string }[] }
  authorId = meData.profiles[0]?.userProfileId ?? ''

  // Create a test post
  const { data: post } = await client.posts.post(
    {
      authorId,
      postTitle: 'Test post for reviews',
      description: 'This is a test post for review functionality testing',
      postType: 'OFFER',
    },
    { headers: { Cookie: sessionCookie } },
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postId = (post as any)?.postId
})

describe('POST /reviews', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.handle(
      new Request('http://localhost/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, postId, profileId: authorId }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('creates a review with valid data (201)', async () => {
    const { data, error } = await client.reviews.post(
      { rating: 5, reviewDescription: 'Excellent service!', postId, profileId: authorId },
      { headers: { Cookie: sessionCookie } },
    )

    expect(error).toBeNull()
    expect(data).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((data as any)?.rating).toBe(5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reviewId = (data as any)?.reviewId
  })

  it('returns 409 for duplicate review', async () => {
    const { error } = await client.reviews.post(
      { rating: 4, postId, profileId: authorId },
      { headers: { Cookie: sessionCookie } },
    )

    expect(error?.status).toBe(409)
  })

  it('returns 404 for non-existent post', async () => {
    const { error } = await client.reviews.post(
      { rating: 5, postId: '00000000-0000-0000-0000-000000000000', profileId: authorId },
      { headers: { Cookie: sessionCookie } },
    )

    expect(error?.status).toBe(404)
  })
})

describe('DELETE /reviews/:id', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.handle(
      new Request(`http://localhost/reviews/${reviewId}`, {
        method: 'DELETE',
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent review', async () => {
    const { error } = await client.reviews({ id: '00000000-0000-0000-0000-000000000000' }).delete(undefined, {
      headers: { Cookie: sessionCookie },
    })

    expect(error?.status).toBe(404)
  })

  it('soft deletes own review (204)', async () => {
    // First create a new post and review since the first one was already deleted or not available
    const { data: newPost } = await client.posts.post(
      {
        authorId,
        postTitle: 'Another test post for delete',
        description: 'This post is for testing delete functionality',
        postType: 'REQUEST',
      },
      { headers: { Cookie: sessionCookie } },
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newPostId = (newPost as any)?.postId

    // Create another review
    const { data: newReview } = await client.reviews.post(
      { rating: 3, postId: newPostId, profileId: authorId },
      { headers: { Cookie: sessionCookie } },
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newReviewId = (newReview as any)?.reviewId

    // Now delete it
    const { error } = await client.reviews({ id: newReviewId }).delete(undefined, {
      headers: { Cookie: sessionCookie },
    })

    expect(error).toBeNull()

    // Verify review was soft deleted (should not appear in post details)
    const { data: post } = await client.posts({ id: newPostId }).get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviews = (post as any)?.reviews ?? []
    expect(reviews.find((r: { reviewId: string }) => r.reviewId === newReviewId)).toBeUndefined()
  })
})

describe('GET /posts with rating filter', () => {
  it('returns posts filtered by rating range', async () => {
    const { data, error } = await client.posts.get({
      query: { ratingMin: 4, ratingMax: 5 },
    })

    expect(error).toBeNull()
    expect(Array.isArray(data?.items)).toBe(true)
  })
})

describe('GET /posts with review count sort', () => {
  it('returns posts sorted by most reviews', async () => {
    const { data, error } = await client.posts.get({
      query: { sort: 'reviews-most' },
    })

    expect(error).toBeNull()
    expect(Array.isArray(data?.items)).toBe(true)
  })

  it('returns posts sorted by least reviews', async () => {
    const { data, error } = await client.posts.get({
      query: { sort: 'reviews-least' },
    })

    expect(error).toBeNull()
    expect(Array.isArray(data?.items)).toBe(true)
  })
})
