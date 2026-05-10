import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { favouritesRoutes } from '.'
import { postsRoutes } from '../posts'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { authRoutes } from '../auth'
import { auth } from '../auth/service'
import { errorsPlugin } from '../../lib/errors'

const app = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(profilesRoutes)
  .use(postsRoutes)
  .use(favouritesRoutes)

const client = treaty(app)

let sessionCookie: string
let profileId: string
let postId: string

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''

  const meData = (await (
    await app.handle(
      new Request('http://localhost/users/me', { headers: { Cookie: sessionCookie } }),
    )
  ).json()) as { profiles: { userProfileId: string }[] }
  profileId = meData.profiles[0]?.userProfileId ?? ''

  const { data: post } = await client.posts.post(
    {
      authorId: profileId,
      postTitle: 'Post to favourite',
      description: 'This post will be favourited in tests',
      postType: 'OFFER',
    },
    { headers: { Cookie: sessionCookie } },
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postId = (post as any)?.postId
})

describe('GET /favourites', () => {
  it('returns 401 when not authenticated', async () => {
    const { error } = await client.favourites.get({ query: { profileId } })
    expect(error?.status).toBe(401)
  })

  it('returns 200 with items and total when authenticated', async () => {
    const { data, error } = await client.favourites.get({
      headers: { Cookie: sessionCookie },
      query: { profileId },
    })
    expect(error).toBeNull()
    expect(Array.isArray(data!.items)).toBe(true)
    expect(typeof data!.total).toBe('number')
  })
})

describe('POST /favourites/:postId', () => {
  it('returns 401 when not authenticated', async () => {
    const { error } = await client.favourites({ postId }).post({ profileId })
    expect(error?.status).toBe(401)
  })

  it('returns 404 for non-existent post', async () => {
    const { error } = await client
      .favourites({ postId: '00000000-0000-0000-0000-000000000000' })
      .post({ profileId }, { headers: { Cookie: sessionCookie } })
    expect(error?.status).toBe(404)
  })

  it('adds a favourite and returns 201', async () => {
    const { data, error } = await client
      .favourites({ postId })
      .post({ profileId }, { headers: { Cookie: sessionCookie } })
    expect(error).toBeNull()
    expect(data!.postId).toBe(postId)
    expect(typeof data!.userProfileId).toBe('string')
  })

  it('returns 409 for duplicate favourite', async () => {
    const { error } = await client
      .favourites({ postId })
      .post({ profileId }, { headers: { Cookie: sessionCookie } })
    expect(error?.status as number).toBe(409)
  })
})

describe('DELETE /favourites/:postId', () => {
  it('returns 401 when not authenticated', async () => {
    const { error } = await client.favourites({ postId }).delete({ profileId })
    expect(error?.status).toBe(401)
  })

  it('removes a favourite and returns 204', async () => {
    const { error } = await client
      .favourites({ postId })
      .delete({ profileId }, { headers: { Cookie: sessionCookie } })
    expect(error).toBeNull()

    const { data } = await client.favourites.get({
      headers: { Cookie: sessionCookie },
      query: { profileId },
    })
    const found = data!.items.find((f: { postId: string }) => f.postId === postId)
    expect(found).toBeUndefined()
  })

  it('returns 404 for non-existent favourite', async () => {
    const { error } = await client
      .favourites({ postId: '00000000-0000-0000-0000-000000000000' })
      .delete({ profileId }, { headers: { Cookie: sessionCookie } })
    expect(error?.status).toBe(404)
  })
})
