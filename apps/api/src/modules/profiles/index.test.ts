import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { profilesRoutes } from '.'

const app = new Elysia().use(profilesRoutes)
const client = treaty(app)

describe('GET /profiles', () => {
  it('returns 200 with an array', async () => {
    const { data, error } = await client.profiles.get()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('each item has required fields', async () => {
    const { data } = await client.profiles.get()
    for (const item of data!) {
      expect(typeof item.userProfileId).toBe('string')
      expect(typeof item.accountId).toBe('string')
      expect(typeof item.name).toBe('string')
      expect(typeof item.email).toBe('string')
      expect(typeof item.accountName).toBe('string')
      expect(typeof item.roleName).toBe('string')
    }
  })

  it('does not return soft-deleted profiles', async () => {
    const { data } = await client.profiles.get()
    for (const item of data!) {
      expect(item).not.toHaveProperty('deletedAt')
    }
  })
})

describe('GET /profiles/:id', () => {
  it('returns 404 for unknown id', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).get()
    expect(error?.status).toBe(404)
  })

  it('returns a profile for a known id', async () => {
    const { data: all } = await client.profiles.get()
    if (!all || all.length === 0) return

    const { data, error } = await client.profiles({ id: all[0]!.userProfileId }).get()
    expect(error).toBeNull()
    expect(data!.userProfileId).toBe(all[0]!.userProfileId)
  })
})

describe('PATCH /profiles/:id', () => {
  it('returns 404 for unknown id', async () => {
    const { error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).patch({
      name: 'Test',
    })
    expect(error?.status).toBe(404)
  })

  it('returns 422 for invalid body (bad email)', async () => {
    const { data: all } = await client.profiles.get()
    if (!all || all.length === 0) return

    const { error } = await client.profiles({ id: all[0]!.userProfileId }).patch({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      email: 'not-an-email' as any,
    })
    expect(error?.status).toBe(422)
  })
})

describe('GET /profiles/:profileId/posts', () => {
  it('returns 200 with an array', async () => {
    const { data: all } = await client.profiles.get()
    if (!all || all.length === 0) return

    const { data, error } = await client.profiles({ id: all[0]!.userProfileId }).posts.get()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it('only returns posts authored by the given profile', async () => {
    const { data: all } = await client.profiles.get()
    if (!all || all.length === 0) return

    const profileId = all[0]!.userProfileId
    const { data } = await client.profiles({ id: profileId }).posts.get()
    for (const post of data!) {
      expect(post.authorId).toBe(profileId)
    }
  })

  it('returns 200 with empty array for unknown profile', async () => {
    const { data, error } = await client.profiles({ id: '00000000-0000-0000-0000-000000000000' }).posts.get()
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})
