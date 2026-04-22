import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { messagesRoutes } from '.'
import { postsRoutes } from '../posts'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { authRoutes } from '../auth'
import { auth } from '../auth/service'
import { errorsPlugin } from '../../lib/errors'
import { db } from '../../db'
import { messageThreads, messages } from '../../db/schema'
import { eq } from 'drizzle-orm'

const app = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(profilesRoutes)
  .use(postsRoutes)
  .use(messagesRoutes)

const client = treaty(app)

// Alice owns posts; Bob initiates a thread on Alice's post
let aliceCookie  = ''
let bobCookie    = ''
let aliceProfile = ''
let bobProfile   = ''
let alicePostId  = ''

beforeAll(async () => {
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

  const { data: aliceMeData } = await client.users.me.get({ headers: { Cookie: aliceCookie } })
  aliceProfile = aliceMeData!.profiles[0]?.userProfileId ?? ''

  const { data: bobMeData } = await client.users.me.get({ headers: { Cookie: bobCookie } })
  bobProfile = bobMeData!.profiles[0]?.userProfileId ?? ''

  const { data: alicePosts } = await client.profiles({ id: aliceProfile }).posts.get({ headers: { Cookie: aliceCookie } })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alicePostId = (alicePosts?.items?.[0] as any)?.postId ?? ''

  // Clean up threads from previous test runs so the tests are idempotent
  if (bobProfile) {
    const existing = await db
      .select({ threadId: messageThreads.threadId })
      .from(messageThreads)
      .where(eq(messageThreads.initiatorId, bobProfile))
    for (const t of existing) {
      await db.delete(messages).where(eq(messages.threadId, t.threadId))
    }
    await db.delete(messageThreads).where(eq(messageThreads.initiatorId, bobProfile))
  }
})

describe('POST /threads', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.threads.post({
      profileId: bobProfile,
      postId:    alicePostId,
      content:   'Hello, is this still available?',
    })
    expect(error?.status).toBe(401)
  })

  it('returns 422 for empty content', async () => {
    const { error } = await client.threads.post(
      { profileId: bobProfile, postId: alicePostId, content: '' },
      { headers: { Cookie: bobCookie } },
    )
    expect(error?.status).toBe(422)
  })

  it('returns 403 when profileId does not belong to session user', async () => {
    const { error } = await client.threads.post(
      { profileId: '00000000-0000-0000-0000-000000000000', postId: alicePostId, content: 'Hi' },
      { headers: { Cookie: bobCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('returns 403 when the post owner tries to message their own post', async () => {
    const { error } = await client.threads.post(
      { profileId: aliceProfile, postId: alicePostId, content: 'Self-message attempt' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('creates a thread and returns 201 with threadId', async () => {
    const { data, error } = await client.threads.post(
      { profileId: bobProfile, postId: alicePostId, content: 'Hello, is this still available?' },
      { headers: { Cookie: bobCookie } },
    )
    expect(error).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (data as any)?.threadId).toBe('string')
  })

  it('returns 409 when creating a duplicate thread for the same post', async () => {
    const { error } = await client.threads.post(
      { profileId: bobProfile, postId: alicePostId, content: 'Duplicate message' },
      { headers: { Cookie: bobCookie } },
    )
    expect(error?.status).toBe(409)
  })
})

describe('GET /threads', () => {
  it('returns 401 without a session', async () => {
    const { error } = await client.threads.get({ query: { profileId: bobProfile } })
    expect(error?.status).toBe(401)
  })

  it('returns 403 when profileId does not belong to session user', async () => {
    const { error } = await client.threads.get({
      query:   { profileId: '00000000-0000-0000-0000-000000000000' },
      headers: { Cookie: bobCookie },
    })
    expect(error?.status).toBe(403)
  })

  it("returns Bob's threads — includes the created thread", async () => {
    const { data, error } = await client.threads.get({
      query:   { profileId: bobProfile },
      headers: { Cookie: bobCookie },
    })
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    expect(data!.length).toBeGreaterThan(0)
    const thread = data![0]!
    expect(typeof thread.threadId).toBe('string')
    expect(typeof thread.postTitle).toBe('string')
    expect(['OFFER', 'REQUEST']).toContain(thread.postType)
    expect(['provider', 'client']).toContain(thread.label)
    expect(thread.myRole).toBe('initiator')
  })

  it("returns Alice's threads with myRole = post_owner", async () => {
    const { data } = await client.threads.get({
      query:   { profileId: aliceProfile },
      headers: { Cookie: aliceCookie },
    })
    expect(Array.isArray(data)).toBe(true)
    expect(data!.length).toBeGreaterThan(0)
    expect(data![0]!.myRole).toBe('post_owner')
  })

  it('filters by postId — returns only the matching thread', async () => {
    const { data } = await client.threads.get({
      query:   { profileId: bobProfile, postId: alicePostId },
      headers: { Cookie: bobCookie },
    })
    expect(data!.length).toBe(1)
    expect(data![0]!.postId).toBe(alicePostId)
  })

  it('unreadCount is a non-negative number', async () => {
    const { data } = await client.threads.get({
      query:   { profileId: bobProfile },
      headers: { Cookie: bobCookie },
    })
    expect(data![0]!.unreadCount).toBeGreaterThanOrEqual(0)
  })
})

describe('GET /threads/:threadId', () => {
  let threadId = ''

  beforeAll(async () => {
    const { data } = await client.threads.get({
      query:   { profileId: bobProfile, postId: alicePostId },
      headers: { Cookie: bobCookie },
    })
    threadId = data?.[0]?.threadId ?? ''
  })

  it('returns 401 without a session', async () => {
    const { error } = await client.threads({ threadId }).get({
      query: { profileId: bobProfile },
    })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a non-participant', async () => {
    const carolRes = await auth.api.signInEmail({
      body: { email: 'carol@example.com', password: 'password123' },
      asResponse: true,
    })
    const carolCookie = carolRes.headers.get('set-cookie') ?? ''
    const { data: carolMeData } = await client.users.me.get({ headers: { Cookie: carolCookie } })
    const carolProfile = carolMeData!.profiles[0]?.userProfileId ?? ''

    const { error } = await client.threads({ threadId }).get({
      query:   { profileId: carolProfile },
      headers: { Cookie: carolCookie },
    })
    expect(error?.status).toBe(403)
  })

  it('returns 200 with thread and messages for Bob (initiator)', async () => {
    const { data, error } = await client.threads({ threadId }).get({
      query:   { profileId: bobProfile },
      headers: { Cookie: bobCookie },
    })
    expect(error).toBeNull()
    expect(data!.threadId).toBe(threadId)
    expect(Array.isArray(data!.messages)).toBe(true)
    expect(data!.messages.length).toBeGreaterThan(0)
    expect(data!.myRole).toBe('initiator')
  })

  it('returns 200 with myRole = post_owner for Alice', async () => {
    const { data, error } = await client.threads({ threadId }).get({
      query:   { profileId: aliceProfile },
      headers: { Cookie: aliceCookie },
    })
    expect(error).toBeNull()
    expect(data!.myRole).toBe('post_owner')
  })

  it('marks messages as read — Alice opens thread, then unreadCount drops to 0', async () => {
    await client.threads({ threadId }).get({
      query:   { profileId: aliceProfile },
      headers: { Cookie: aliceCookie },
    })
    const { data } = await client.threads.get({
      query:   { profileId: aliceProfile },
      headers: { Cookie: aliceCookie },
    })
    const thread = data!.find((t) => t.threadId === threadId)
    expect(thread?.unreadCount).toBe(0)
  })
})

describe('POST /threads/:threadId/messages', () => {
  let threadId = ''

  beforeAll(async () => {
    const { data } = await client.threads.get({
      query:   { profileId: bobProfile, postId: alicePostId },
      headers: { Cookie: bobCookie },
    })
    threadId = data?.[0]?.threadId ?? ''
  })

  it('returns 401 without a session', async () => {
    const { error } = await client.threads({ threadId }).messages.post({
      profileId: aliceProfile,
      content:   'Hi Bob!',
    })
    expect(error?.status).toBe(401)
  })

  it('returns 403 for a non-participant', async () => {
    const carolRes = await auth.api.signInEmail({
      body: { email: 'carol@example.com', password: 'password123' },
      asResponse: true,
    })
    const carolCookie = carolRes.headers.get('set-cookie') ?? ''
    const { data: carolMeData } = await client.users.me.get({ headers: { Cookie: carolCookie } })
    const carolProfile = carolMeData!.profiles[0]?.userProfileId ?? ''

    const { error } = await client.threads({ threadId }).messages.post(
      { profileId: carolProfile, content: 'Intruder!' },
      { headers: { Cookie: carolCookie } },
    )
    expect(error?.status).toBe(403)
  })

  it('allows Alice (post owner) to reply — returns 201', async () => {
    const { data, error } = await client.threads({ threadId }).messages.post(
      { profileId: aliceProfile, content: 'Yes, still available!' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (data as any)?.messageId).toBe('string')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((data as any)?.sentByMe).toBe(true)
  })

  it('allows Bob (initiator) to reply — returns 201', async () => {
    const { data, error } = await client.threads({ threadId }).messages.post(
      { profileId: bobProfile, content: 'Great, I will take it!' },
      { headers: { Cookie: bobCookie } },
    )
    expect(error).toBeNull()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (data as any)?.messageId).toBe('string')
  })

  it('returns 422 for empty content', async () => {
    const { error } = await client.threads({ threadId }).messages.post(
      { profileId: aliceProfile, content: '' },
      { headers: { Cookie: aliceCookie } },
    )
    expect(error?.status).toBe(422)
  })
})
