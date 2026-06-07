import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { adminPostsRoutes } from '.'
import { postsRoutes } from '../../posts'
import { profilesRoutes } from '../../profiles'
import { usersRoutes } from '../../users'
import { authRoutes } from '../../auth'
import { auth } from '../../auth/service'
import { errorsPlugin } from '../../../lib/errors'
import { sentNotifications } from '../../../lib/email'
import { db } from '../../../db'
import { posts } from '../../../db/schema'
import { eq } from 'drizzle-orm'

const app = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(postsRoutes)
  .use(profilesRoutes)
  .use(adminPostsRoutes)
const client = treaty(app)

let adminCookie: string
let userCookie: string
let testPostId: string
let authorProfileId: string

beforeAll(async () => {
  const adminRes = await auth.api.signInEmail({
    body: { email: 'admin@example.com', password: 'admin123' },
    asResponse: true,
  })
  adminCookie = adminRes.headers.get('set-cookie') ?? ''

  const userRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  userCookie = userRes.headers.get('set-cookie') ?? ''

  const { data: meData } = await client.users.me.get({ headers: { Cookie: userCookie } })
  authorProfileId = meData!.profiles[0]?.userProfileId ?? ''

  const { data: created } = await client.posts.post(
    {
      authorId: authorProfileId,
      postTitle: 'Post to be banned',
      description: 'This post will be banned by admin in tests',
      postType: 'OFFER',
    },
    { headers: { Cookie: userCookie } },
  )
  testPostId = (created as { postId: string }).postId
})

describe('DELETE /admin/posts/:id', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client['admin']
      .posts({ id: testPostId })
      .delete({ banReason: 'test' }, { headers: { Cookie: '' } })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for user without AdminPostsDeleteAny', async () => {
    const { error } = await client['admin']
      .posts({ id: testPostId })
      .delete({ banReason: 'test' }, { headers: { Cookie: userCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns 404 for unknown post id', async () => {
    const { error } = await client['admin']
      .posts({ id: '00000000-0000-0000-0000-000000000000' })
      .delete({ banReason: 'spam' }, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(404)
  })

  it('bans the post, sets bannedAt + banReason, and returns 204', async () => {
    sentNotifications.length = 0
    const { error } = await client['admin']
      .posts({ id: testPostId })
      .delete({ banReason: 'Violates guidelines' }, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()

    const row = await db.query.posts.findFirst({ where: eq(posts.postId, testPostId) })
    expect(row?.bannedAt).not.toBeNull()
    expect(row?.banReason).toBe('Violates guidelines')

    const { error: getError } = await client.posts({ id: testPostId }).get()
    expect(getError?.status).toBe(404)

    expect(sentNotifications).toHaveLength(1)
    expect(sentNotifications[0]!.html).toContain('Violates guidelines')
  })

  it('returns 422 when banReason is missing', async () => {
    const { data: fresh } = await client.posts.post(
      {
        authorId: authorProfileId,
        postTitle: 'No reason post',
        description: 'This post will fail to ban',
        postType: 'OFFER',
      },
      { headers: { Cookie: userCookie } },
    )
    const freshId = (fresh as { postId: string }).postId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await client['admin']
      .posts({ id: freshId })
      .delete({} as any, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(422)
  })
})

describe('PATCH /admin/posts/:id/unban', () => {
  let bannedPostId: string

  beforeAll(async () => {
    const { data } = await client.posts.post(
      {
        authorId: authorProfileId,
        postTitle: 'Post to unban',
        description: 'This post will be banned then unbanned',
        postType: 'OFFER',
      },
      { headers: { Cookie: userCookie } },
    )
    bannedPostId = (data as { postId: string }).postId
    await client['admin']
      .posts({ id: bannedPostId })
      .delete({ banReason: 'test ban' }, { headers: { Cookie: adminCookie } })
  })

  it('returns 401 without a session', async () => {
    const { error } = await client['admin']
      .posts({ id: bannedPostId })
      .unban.patch(undefined, { headers: { Cookie: '' } })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for user without AdminPostsDeleteAny', async () => {
    const { error } = await client['admin']
      .posts({ id: bannedPostId })
      .unban.patch(undefined, { headers: { Cookie: userCookie } })
    expect(error?.status).toBe(403)
  })

  it('returns 404 for a post that is not banned', async () => {
    const { data: fresh } = await client.posts.post(
      {
        authorId: authorProfileId,
        postTitle: 'Active post',
        description: 'Not banned',
        postType: 'OFFER',
      },
      { headers: { Cookie: userCookie } },
    )
    const freshId = (fresh as { postId: string }).postId
    const { error } = await client['admin']
      .posts({ id: freshId })
      .unban.patch(undefined, { headers: { Cookie: adminCookie } })
    expect(error?.status).toBe(404)
  })

  it('clears bannedAt + banReason and returns 204, sends email', async () => {
    sentNotifications.length = 0
    const { error } = await client['admin']
      .posts({ id: bannedPostId })
      .unban.patch(undefined, { headers: { Cookie: adminCookie } })
    expect(error).toBeNull()

    const row = await db.query.posts.findFirst({ where: eq(posts.postId, bannedPostId) })
    expect(row?.bannedAt).toBeNull()
    expect(row?.banReason).toBeNull()

    expect(sentNotifications).toHaveLength(1)
    expect(sentNotifications[0]!.html).toContain('reinstated')
  })
})
