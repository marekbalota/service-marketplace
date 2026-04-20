import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
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
  .use(profilesRoutes)
  .use(categoriesRoutes)

const client = treaty(app)

let sessionCookie = ''
let authorCookie = ''
let reporterProfileId = ''
let postId = ''

beforeAll(async () => {
  // Sign in as alice (will be the reporter)
  const signInRes = await app.handle(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'password123' }),
    }),
  )
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''

  const meData = await (
    await app.handle(new Request('http://localhost/users/me', { headers: { Cookie: sessionCookie } }))
  ).json() as { profiles: { userProfileId: string }[] }
  reporterProfileId = meData.profiles[0]?.userProfileId ?? ''

  // Sign in as bob (will be the post author so alice can report)
  const authorRes = await app.handle(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob@example.com', password: 'password123' }),
    }),
  )
  authorCookie = authorRes.headers.get('set-cookie') ?? ''

  const bobData = await (
    await app.handle(new Request('http://localhost/users/me', { headers: { Cookie: authorCookie } }))
  ).json() as { profiles: { userProfileId: string }[] }
  const authorId = bobData.profiles[0]?.userProfileId ?? ''

  const { data: post } = await client.posts.post(
    {
      authorId,
      postTitle: 'Test post for reports',
      description: 'This is a test post for report functionality testing',
      postType: 'OFFER',
    },
    { headers: { Cookie: authorCookie } },
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postId = (post as any)?.postId ?? ''
})

describe('POST /posts/:id/reports', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.handle(
      new Request(`http://localhost/posts/${postId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'spam', description: 'This is spam' }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent post', async () => {
    const { error } = await client.posts({ id: '00000000-0000-0000-0000-000000000000' }).reports.post(
      { reason: 'spam', description: 'This is spam' },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error?.status).toBe(404)
  })

  it('creates a report with valid data (201)', async () => {
    const { data, error } = await client.posts({ id: postId }).reports.post(
      { reason: 'spam', description: 'This post is spam' },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    expect(data).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((data as any)?.reason).toBe('spam')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((data as any)?.postId).toBe(postId)
  })

  it('returns 409 for duplicate report', async () => {
    const { error } = await client.posts({ id: postId }).reports.post(
      { reason: 'misleading', description: 'Reported again' },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error?.status).toBe(409)
  })

  it('returns 403 when post owner tries to report their own post', async () => {
    const { error } = await client.posts({ id: postId }).reports.post(
      { reason: 'spam', description: 'Self-report attempt' },
      { headers: { Cookie: authorCookie } },
    )
    expect(error?.status).toBe(403)
  })
})

describe('GET /posts/:id/reports/check', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.handle(
      new Request(`http://localhost/posts/${postId}/reports/check`),
    )
    expect(res.status).toBe(401)
  })

  it('returns hasReported: true after reporting', async () => {
    const { data, error } = await client.posts({ id: postId }).reports.check.get(
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((data as any)?.hasReported).toBe(true)
  })

  it('returns hasReported: false for a post not yet reported', async () => {
    const { data: freshPost } = await client.posts.post(
      {
        authorId: reporterProfileId,
        postTitle: 'Another post for check test',
        description: 'Not reported yet',
        postType: 'REQUEST',
      },
      { headers: { Cookie: sessionCookie } },
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const freshPostId = (freshPost as any)?.postId ?? ''

    const { data, error } = await client.posts({ id: freshPostId }).reports.check.get(
      { headers: { Cookie: authorCookie } },
    )
    expect(error).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((data as any)?.hasReported).toBe(false)
  })
})
