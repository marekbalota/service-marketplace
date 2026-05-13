import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { adminReportsRoutes } from '.'
import { adminUsersRoutes } from '../users'
import { authRoutes } from '../../auth'
import { usersRoutes } from '../../users'
import { postsRoutes } from '../../posts'
import { profilesRoutes } from '../../profiles'
import { reportCategoriesRoutes } from '../../reports'
import { errorsPlugin } from '../../../lib/errors'
import { auth } from '../../auth/service'

const app = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(postsRoutes)
  .use(profilesRoutes)
  .use(reportCategoriesRoutes)
  .use(adminUsersRoutes)
  .use(adminReportsRoutes)
const client = treaty(app)

let adminCookie: string
let aliceCookie: string
let bobCookie: string
let testReportId: string
let testPostId: string
let bobProfileId: string

beforeAll(async () => {
  const adminRes = await auth.api.signInEmail({
    body: { email: 'admin@example.com', password: 'admin123' },
    asResponse: true,
  })
  adminCookie = adminRes.headers.get('set-cookie') ?? ''

  const aliceRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  aliceCookie = aliceRes.headers.get('set-cookie') ?? ''

  const bobRes = await auth.api.signInEmail({
    body: { email: 'bob@example.com', password: 'password123' },
    asResponse: true,
  })
  bobCookie = bobRes.headers.get('set-cookie') ?? ''

  // Get bob's profile id (reporter)
  const { data: bobMe } = await client.users.me.get({ headers: { Cookie: bobCookie } })
  bobProfileId = bobMe!.profiles[0]?.userProfileId ?? ''

  // Get alice's profile id (post author)
  const { data: aliceMe } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
  const aliceProfileId = aliceMe!.profiles[0]?.userProfileId ?? ''

  // Create a post as alice to report
  const { data: post } = await client.posts.post(
    {
      authorId: aliceProfileId,
      postTitle: 'Post to be reported',
      description: 'This post will be reported in tests',
      postType: 'OFFER',
    },
    { headers: { Cookie: aliceCookie } },
  )
  testPostId = (post as { postId: string }).postId

  // Get a POST category
  const { data: categories } = await client['report-categories'].get({
    query: { targetType: 'POST' },
  })
  const categoryId = categories![0]!.categoryId

  // Bob reports alice's post
  const { data: report } = await client.posts({ id: testPostId }).reports.post(
    { categoryId, description: 'Test report for integration tests' },
    { headers: { Cookie: bobCookie } },
  )
  testReportId = (report as { reportId: string }).reportId
})

describe('GET /admin/reports', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.admin.reports.get()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client.admin.reports.get({
      headers: { Cookie: aliceCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('returns 200 with report list and stats for admin', async () => {
    const { data, error } = await client.admin.reports.get({
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
    expect(typeof data!.total).toBe('number')
    expect(typeof data!.totalPending).toBe('number')
    expect(typeof data!.totalResolved).toBe('number')
    expect(typeof data!.totalDismissed).toBe('number')
    expect(typeof data!.totalPages).toBe('number')
    expect(data!.totalPending + data!.totalResolved + data!.totalDismissed).toBe(data!.total)
  })

  it('returns report items with expected shape', async () => {
    const { data, error } = await client.admin.reports.get({
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    const item = data!.items.find((r) => r.reportId === testReportId)
    expect(item).toBeTruthy()
    expect(item!.targetType).toBe('POST')
    expect(item!.reportedItem).toBe('Post to be reported')
    expect(item!.reporterName).toBeTruthy()
    expect(item!.reportedUserId).toBeTruthy()
    expect(item!.status).toBe('PENDING')
  })

  it('filters by targetType', async () => {
    const { data, error } = await client.admin.reports.get({
      query: { targetType: 'POST' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items.every((r) => r.targetType === 'POST')).toBe(true)
  })

  it('filters by status', async () => {
    const { data, error } = await client.admin.reports.get({
      query: { status: 'PENDING' },
      headers: { Cookie: adminCookie },
    })
    expect(error).toBeNull()
    expect(data!.items.every((r) => r.status === 'PENDING')).toBe(true)
  })

  it('stats are consistent — totalPending matches pending filter count', async () => {
    const { data: all } = await client.admin.reports.get({ headers: { Cookie: adminCookie } })
    const { data: pending } = await client.admin.reports.get({
      query: { status: 'PENDING' },
      headers: { Cookie: adminCookie },
    })
    expect(all!.totalPending).toBe(pending!.total)
  })
})

describe('PATCH /admin/reports/:id/resolve', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.admin.reports({ id: testReportId }).resolve.patch()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client.admin
      .reports({ id: testReportId })
      .resolve.patch(undefined, { headers: { Cookie: aliceCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns 404 for unknown report id', async () => {
    const { error } = await client.admin
      .reports({ id: '00000000-0000-0000-0000-000000000000' })
      .resolve.patch(undefined, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(404)
  })

  it('resolves report and returns 204', async () => {
    const { error } = await client.admin
      .reports({ id: testReportId })
      .resolve.patch(undefined, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()

    const { data } = await client.admin.reports.get({
      query: { status: 'RESOLVED' },
      headers: { Cookie: adminCookie },
    })
    expect(data!.items.some((r) => r.reportId === testReportId)).toBe(true)
  })
})

describe('PATCH /admin/reports/:id/dismiss', () => {
  let dismissTargetId: string

  beforeAll(async () => {
    // Create a fresh report to dismiss (testReportId is now resolved)
    const { data: aliceMe } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
    const aliceProfileId = aliceMe!.profiles[0]?.userProfileId ?? ''

    const { data: post2 } = await client.posts.post(
      {
        authorId: aliceProfileId,
        postTitle: 'Post to be dismissed',
        description: 'This post report will be dismissed',
        postType: 'OFFER',
      },
      { headers: { Cookie: aliceCookie } },
    )
    const post2Id = (post2 as { postId: string }).postId

    const { data: categories } = await client['report-categories'].get({
      query: { targetType: 'POST' },
    })
    const categoryId = categories![0]!.categoryId

    const { data: report2 } = await client.posts({ id: post2Id }).reports.post(
      { categoryId, description: 'To be dismissed' },
      { headers: { Cookie: bobCookie } },
    )
    dismissTargetId = (report2 as { reportId: string }).reportId
  })

  it('returns 401 without a session', async () => {
    const { error } = await client.admin.reports({ id: dismissTargetId }).dismiss.patch()
    expect(error?.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    const { error } = await client.admin
      .reports({ id: dismissTargetId })
      .dismiss.patch(undefined, { headers: { Cookie: aliceCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns 404 for unknown report id', async () => {
    const { error } = await client.admin
      .reports({ id: '00000000-0000-0000-0000-000000000000' })
      .dismiss.patch(undefined, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(404)
  })

  it('dismisses report and returns 204', async () => {
    const { error } = await client.admin
      .reports({ id: dismissTargetId })
      .dismiss.patch(undefined, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()

    const { data } = await client.admin.reports.get({
      query: { status: 'DISMISSED' },
      headers: { Cookie: adminCookie },
    })
    expect(data!.items.some((r) => r.reportId === dismissTargetId)).toBe(true)
  })
})
