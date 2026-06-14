import { mock, describe, it, expect, beforeAll } from 'bun:test'

// Mock MinIO storage BEFORE any module that imports it is resolved.
mock.module('../../lib/storage', () => ({
  uploadReviewImage: async (_file: File, reviewId: string) =>
    `http://localhost:9000/marketplace/reviews/${reviewId}/test.jpg`,
  uploadImage: async (_file: File, profileId: string) =>
    `http://localhost:9000/marketplace/profiles/${profileId}/test.jpg`,
  deleteUploadedImage: async () => {},
  initBucket: async () => {},
  minioClient: {},
}))

import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { reviewImagesRoutes } from '.'
import { reviewsRoutes } from '../reviews'
import { postsRoutes } from '../posts'
import { authRoutes } from '../auth'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { categoriesRoutes } from '../categories'
import { errorsPlugin } from '../../lib/errors'
import { auth } from '../auth/service'

const app = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(postsRoutes)
  .use(reviewsRoutes)
  .use(reviewImagesRoutes)
  .use(profilesRoutes)
  .use(categoriesRoutes)

const client = treaty<typeof app>(app)

const fakeJpeg = new File([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], 'review-photo.jpg', {
  type: 'image/jpeg',
})

let sessionCookie = ''
let bobCookie = ''
let profileId = ''
let postId = ''
let reviewId = ''
let reviewImageId = ''

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''

  const bobSignIn = await auth.api.signInEmail({
    body: { email: 'user@example.com', password: 'password123' },
    asResponse: true,
  })
  bobCookie = bobSignIn.headers.get('set-cookie') ?? ''

  const { data: me } = await client.users.me.get({ headers: { Cookie: sessionCookie } })
  profileId = me!.profiles[0]!.userProfileId

  const { data: post } = await client.posts.post(
    {
      authorId: profileId,
      postTitle: 'Test post for review images',
      description: 'Testing review image uploads functionality',
      postType: 'OFFER',
    },
    { headers: { Cookie: sessionCookie } },
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postId = (post as any)?.postId

  const { data: review } = await client.reviews.post(
    { rating: 5, postId, profileId },
    { headers: { Cookie: sessionCookie } },
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reviewId = (review as any)?.reviewId
})

describe('POST /review-images', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client['review-images'].post({ file: fakeJpeg, reviewId })
    expect(error?.status).toBe(401)
  })

  it('returns 404 for a non-existent review', async () => {
    const { error } = await client['review-images'].post(
      { file: fakeJpeg, reviewId: '00000000-0000-0000-0000-000000000000' },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error?.status).toBe(404)
  })

  it('returns 201 with the created review image', async () => {
    const { data, error } = await client['review-images'].post(
      { file: fakeJpeg, reviewId },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    expect(data!.reviewId).toBe(reviewId)
    expect(data!.link).toContain(reviewId)
    expect(data!.name).toBe('review-photo.jpg')
    reviewImageId = data!.reviewImageId
  })

  it('uploaded image appears in GET /posts/:id (nested in reviews)', async () => {
    const { data: post } = await client.posts({ id: postId }).get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviews = (post as any)?.reviews ?? []
    const review = reviews.find((r: { reviewId: string }) => r.reviewId === reviewId)
    expect(review).toBeDefined()
    expect(review.images).toHaveLength(1)
    expect(review.images[0].reviewImageId).toBe(reviewImageId)
  })
})

describe('DELETE /review-images/:id', () => {
  it('returns 401 without a session cookie', async () => {
    const { error } = await client['review-images']({ id: reviewImageId }).delete()
    expect(error?.status).toBe(401)
  })

  it('returns 403 when deleting a review image owned by another user', async () => {
    const { error } = await client['review-images']({ id: reviewImageId }).delete(undefined, {
      headers: { Cookie: bobCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('returns 404 for a non-existent review image', async () => {
    const { error } = await client['review-images']({
      id: '00000000-0000-0000-0000-000000000000',
    }).delete(undefined, { headers: { Cookie: sessionCookie } })
    expect(error?.status).toBe(404)
  })

  it('returns 204 and soft-deletes the review image', async () => {
    const { error } = await client['review-images']({ id: reviewImageId }).delete(undefined, {
      headers: { Cookie: sessionCookie },
    })
    expect(error).toBeNull()

    const { data: post } = await client.posts({ id: postId }).get()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviews = (post as any)?.reviews ?? []
    const review = reviews.find((r: { reviewId: string }) => r.reviewId === reviewId)
    expect(review.images).toHaveLength(0)
  })
})
