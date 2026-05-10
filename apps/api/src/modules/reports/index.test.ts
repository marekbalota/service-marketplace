import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { and, isNull, eq, ne } from 'drizzle-orm'
import { db } from '../../db'
import { posts, reports, reportCategories } from '../../db/schema'
import { postsRoutes } from '../posts'
import { authRoutes } from '../auth'
import { auth } from '../auth/service'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { categoriesRoutes } from '../categories'
import { reportCategoriesRoutes } from './index'
import { errorsPlugin } from '../../lib/errors'

const app = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(postsRoutes)
  .use(profilesRoutes)
  .use(categoriesRoutes)
  .use(reportCategoriesRoutes)

const client = treaty(app)

let sessionCookie = ''
let ownPostId = '' // post authored by alice (for 403 self-report test)
let otherPostId = '' // post NOT authored by alice (for 201/409/check tests)
let spamCategoryId = ''

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''

  const { data: meData } = await client.users.me.get({ headers: { Cookie: sessionCookie } })
  const aliceProfileId = meData?.profiles[0]?.userProfileId ?? ''

  // Clean up any leftover reports from all of alice's profiles to avoid 409 in the 201 test
  for (const profile of meData?.profiles ?? []) {
    await db.delete(reports).where(eq(reports.reporterId, profile.userProfileId))
  }

  // Find a post authored by alice's first profile (the one that will be used for reporting)
  const [alicePost] = await db
    .select({ postId: posts.postId })
    .from(posts)
    .where(and(eq(posts.authorId, aliceProfileId), isNull(posts.deletedAt)))
    .limit(1)
  ownPostId = alicePost?.postId ?? ''

  // Ensure we have a valid post for the self-report test
  if (!ownPostId) {
    // Create a post for alice if none exists
    const { data: createdPost } = await client.posts.post(
      {
        authorId: aliceProfileId,
        postTitle: 'Test post for report test',
        description: 'This is a test post for the self-report test',
        postType: 'OFFER',
      },
      { headers: { Cookie: sessionCookie } },
    )
    ownPostId = createdPost?.postId ?? ''
  }

  // Find a post NOT authored by alice
  const [otherPost] = await db
    .select({ postId: posts.postId })
    .from(posts)
    .where(and(ne(posts.authorId, aliceProfileId), isNull(posts.deletedAt)))
    .limit(1)
  otherPostId = otherPost?.postId ?? ''

  // Get the 'spam' POST category from DB
  const [spamCat] = await db
    .select({ categoryId: reportCategories.categoryId })
    .from(reportCategories)
    .where(and(eq(reportCategories.targetType, 'POST'), eq(reportCategories.value, 'spam')))
    .limit(1)
  spamCategoryId = spamCat?.categoryId ?? ''
})

describe('GET /report-categories', () => {
  it('returns POST categories without auth', async () => {
    const { data, error } = await client['report-categories'].get({ query: { targetType: 'POST' } })
    expect(error).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cats = data as any[]
    expect(Array.isArray(cats)).toBe(true)
    expect(cats.length).toBeGreaterThan(0)
    expect(cats[0]).toHaveProperty('categoryId')
    expect(cats[0]).toHaveProperty('value')
    expect(cats[0]).toHaveProperty('label')
    expect(cats[0].targetType).toBe('POST')
  })

  it('returns MESSAGE categories', async () => {
    const { data } = await client['report-categories'].get({ query: { targetType: 'MESSAGE' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cats = data as any[]
    expect(cats.every((c: { targetType: string }) => c.targetType === 'MESSAGE')).toBe(true)
  })

  it('returns REVIEW categories', async () => {
    const { data } = await client['report-categories'].get({ query: { targetType: 'REVIEW' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cats = data as any[]
    expect(cats.every((c: { targetType: string }) => c.targetType === 'REVIEW')).toBe(true)
  })
})

describe('POST /posts/:id/reports', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await app.handle(
      new Request(`http://localhost/posts/${otherPostId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: spamCategoryId }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent post', async () => {
    const { error } = await client
      .posts({ id: '00000000-0000-0000-0000-000000000000' })
      .reports.post(
        { categoryId: spamCategoryId, description: 'This is spam' },
        { headers: { Cookie: sessionCookie } },
      )
    expect(error?.status).toBe(404)
  })

  it('returns 403 when reporter is the post author', async () => {
    const { error } = await client
      .posts({ id: ownPostId })
      .reports.post(
        { categoryId: spamCategoryId, description: 'Self-report attempt' },
        { headers: { Cookie: sessionCookie } },
      )
    expect(error?.status).toBe(403)
  })

  it('creates a report with valid data (201)', async () => {
    const { data, error } = await client
      .posts({ id: otherPostId })
      .reports.post(
        { categoryId: spamCategoryId, description: 'This post is spam' },
        { headers: { Cookie: sessionCookie } },
      )
    expect(error).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((data as any)?.categoryId).toBe(spamCategoryId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((data as any)?.postId).toBe(otherPostId)
  })

  it('returns 409 for duplicate report', async () => {
    const { error } = await client
      .posts({ id: otherPostId })
      .reports.post(
        { categoryId: spamCategoryId, description: 'Reported again' },
        { headers: { Cookie: sessionCookie } },
      )
    expect(error?.status).toBe(409)
  })
})
