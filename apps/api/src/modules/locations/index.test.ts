import { describe, it, expect, beforeAll } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { locationsRoutes } from '.'
import { authRoutes } from '../auth'
import { postsRoutes } from '../posts'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { auth } from '../auth/service'

const app = new Elysia()
  .use(authRoutes)
  .use(usersRoutes)
  .use(profilesRoutes)
  .use(postsRoutes)
  .use(locationsRoutes)
const client = treaty(app)

let sessionCookie = ''
let authorId = ''

beforeAll(async () => {
  const signInRes = await auth.api.signInEmail({
    body: { email: 'alice@example.com', password: 'password123' },
    asResponse: true,
  })
  sessionCookie = signInRes.headers.get('set-cookie') ?? ''
  const { data: meData } = await client.users.me.get({ headers: { Cookie: sessionCookie } })
  authorId = meData!.profiles[0]?.userProfileId ?? ''

  // Seed known-location posts so filter tests have data to work with
  await client.posts.post(
    {
      authorId,
      postTitle: 'Location test post Slovakia Trencin',
      description: 'Test post for location filter with known location data',
      postType: 'OFFER',
      location: { country: 'Slovakia', region: 'Trenčín', city: 'Trenčín' },
    },
    { headers: { Cookie: sessionCookie } },
  )
  await client.posts.post(
    {
      authorId,
      postTitle: 'Location test post Czech Republic Brno',
      description: 'Test post for location filter with known location data',
      postType: 'OFFER',
      location: { country: 'Czech Republic', region: 'South Moravian', city: 'Brno' },
    },
    { headers: { Cookie: sessionCookie } },
  )
})

describe('GET /locations/distinct — field=country', () => {
  it('returns 200 with values array', async () => {
    const res = await app.handle(
      new Request('http://localhost/locations/distinct?field=country'),
    )
    expect(res.status).toBe(200)
    const body = await res.json() as { values: unknown[] }
    expect(Array.isArray(body.values)).toBe(true)
  })

  it('values are strings, not null', async () => {
    const { data, error } = await client.locations.distinct.get({ query: { field: 'country' } })
    expect(error).toBeNull()
    for (const v of data!.values) {
      expect(typeof v).toBe('string')
    }
  })

  it('includes Slovakia from seeded post', async () => {
    const { data } = await client.locations.distinct.get({ query: { field: 'country' } })
    expect(data!.values).toContain('Slovakia')
  })

  it('values are sorted alphabetically', async () => {
    const { data } = await client.locations.distinct.get({ query: { field: 'country' } })
    const sorted = [...data!.values].sort()
    expect(data!.values).toEqual(sorted)
  })
})

describe('GET /locations/distinct — field=region', () => {
  it('returns regions for a known country', async () => {
    const { data, error } = await client.locations.distinct.get({
      query: { field: 'region', country: 'Slovakia' },
    })
    expect(error).toBeNull()
    expect(data!.values).toContain('Trenčín')
  })

  it('case-insensitive: country=slovakia matches Slovakia', async () => {
    const { data } = await client.locations.distinct.get({
      query: { field: 'region', country: 'slovakia' },
    })
    expect(data!.values).toContain('Trenčín')
  })

  it('does not include regions from other countries', async () => {
    const { data } = await client.locations.distinct.get({
      query: { field: 'region', country: 'Slovakia' },
    })
    expect(data!.values).not.toContain('South Moravian')
  })
})

describe('GET /locations/distinct — field=city', () => {
  it('returns cities for a known country + region', async () => {
    const { data, error } = await client.locations.distinct.get({
      query: { field: 'city', country: 'Slovakia', region: 'Trenčín' },
    })
    expect(error).toBeNull()
    expect(data!.values).toContain('Trenčín')
  })

  it('diacritic-insensitive: region=Trencin matches Trenčín', async () => {
    const { data } = await client.locations.distinct.get({
      query: { field: 'city', country: 'Slovakia', region: 'Trencin' },
    })
    expect(data!.values).toContain('Trenčín')
  })

  it('does not include cities from other regions', async () => {
    const { data } = await client.locations.distinct.get({
      query: { field: 'city', country: 'Slovakia', region: 'Trenčín' },
    })
    expect(data!.values).not.toContain('Brno')
  })
})

describe('GET /locations/distinct — validation', () => {
  it('returns 422 when field is missing', async () => {
    const { error } = await client.locations.distinct.get({ query: {} as never })
    expect(error?.status).toBe(422)
  })

  it('returns 422 for an invalid field value', async () => {
    const { error } = await client.locations.distinct.get({ query: { field: 'street' as never } })
    expect(error?.status).toBe(422)
  })
})
