import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { profilesRoutes } from '.'

const app = new Elysia().use(profilesRoutes)

type ProfileItem = {
  userProfileId: string
  accountId: string
  name: string
  email: string
  bio: string | null
  phoneNumber: string | null
  fax: string | null
  createdAt: string
  accountName: string
  roleName: string
}

type PostItem = {
  postId: string
  postTitle: string
  postType: string
  authorId: string
}

describe('GET /profiles', () => {
  it('returns 200', async () => {
    const res = await app.handle(new Request('http://localhost/profiles'))
    expect(res.status).toBe(200)
  })

  it('returns an array', async () => {
    const res = await app.handle(new Request('http://localhost/profiles'))
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('each item has required fields', async () => {
    const res = await app.handle(new Request('http://localhost/profiles'))
    const body = await res.json() as ProfileItem[]
    for (const item of body) {
      expect(typeof item.userProfileId).toBe('string')
      expect(typeof item.accountId).toBe('string')
      expect(typeof item.name).toBe('string')
      expect(typeof item.email).toBe('string')
      expect(typeof item.accountName).toBe('string')
      expect(typeof item.roleName).toBe('string')
    }
  })

  it('does not return soft-deleted profiles', async () => {
    const res = await app.handle(new Request('http://localhost/profiles'))
    const body = await res.json() as ProfileItem[]
    for (const item of body) {
      expect(item).not.toHaveProperty('deletedAt')
    }
  })
})

describe('GET /profiles/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await app.handle(
      new Request('http://localhost/profiles/00000000-0000-0000-0000-000000000000'),
    )
    expect(res.status).toBe(404)
  })

  it('returns a profile for a known id', async () => {
    const allRes = await app.handle(new Request('http://localhost/profiles'))
    const all = await allRes.json() as ProfileItem[]
    if (all.length === 0) return

    const res = await app.handle(
      new Request(`http://localhost/profiles/${all[0]!.userProfileId}`),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as ProfileItem
    expect(body.userProfileId).toBe(all[0]!.userProfileId)
  })
})

describe('PATCH /profiles/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await app.handle(
      new Request('http://localhost/profiles/00000000-0000-0000-0000-000000000000', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      }),
    )
    expect(res.status).toBe(404)
  })

  it('returns 422 for invalid body (bad email)', async () => {
    const allRes = await app.handle(new Request('http://localhost/profiles'))
    const all = await allRes.json() as ProfileItem[]
    if (all.length === 0) return

    const res = await app.handle(
      new Request(`http://localhost/profiles/${all[0]!.userProfileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      }),
    )
    expect(res.status).toBe(422)
  })
})

describe('GET /profiles/:profileId/posts', () => {
  it('returns 200 with an array', async () => {
    const allRes = await app.handle(new Request('http://localhost/profiles'))
    const all = await allRes.json() as ProfileItem[]
    if (all.length === 0) return

    const res = await app.handle(
      new Request(`http://localhost/profiles/${all[0]!.userProfileId}/posts`),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('only returns posts authored by the given profile', async () => {
    const allRes = await app.handle(new Request('http://localhost/profiles'))
    const all = await allRes.json() as ProfileItem[]
    if (all.length === 0) return

    const profileId = all[0]!.userProfileId
    const res = await app.handle(
      new Request(`http://localhost/profiles/${profileId}/posts`),
    )
    const body = await res.json() as PostItem[]
    for (const post of body) {
      expect(post.authorId).toBe(profileId)
    }
  })

  it('returns 200 with empty array for unknown profile', async () => {
    const res = await app.handle(
      new Request('http://localhost/profiles/00000000-0000-0000-0000-000000000000/posts'),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as PostItem[]
    expect(body).toHaveLength(0)
  })
})
