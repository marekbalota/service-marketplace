import { describe, it, expect, beforeEach, spyOn } from 'bun:test'
import { Elysia } from 'elysia'
import { treaty } from '@elysiajs/eden'
import { locationsRoutes } from '.'
import { redis } from '../../lib/redis'
import { errorsPlugin } from '../../lib/errors'
import { authRoutes } from '../auth'
import { profilesRoutes } from '../profiles'
import { usersRoutes } from '../users'
import { auth } from '../auth/service'

const app = new Elysia().use(errorsPlugin).use(locationsRoutes)
const client = treaty(app)

const geoapifyFeature = (placeId: string, overrides: Record<string, unknown> = {}) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [16.608, 49.195] },
  properties: {
    place_id: placeId,
    country: 'Czech Republic',
    state: 'South Moravian Region',
    city: 'Brno',
    street: null,
    ...overrides,
  },
})

function mockGeoapify(features: unknown[]) {
  return spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify({ type: 'FeatureCollection', features }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('GET /locations/autocomplete', () => {
  beforeEach(async () => {
    await redis.flushdb()
  })

  it('returns 422 when q is missing', async () => {
    const { error } = await client.locations.autocomplete.get({ query: {} as never })
    expect(error?.status).toBe(422)
  })

  it('returns suggestions from Geoapify and caches them in Redis', async () => {
    mockGeoapify([geoapifyFeature('place-brno-123')])

    const { data, error } = await client.locations.autocomplete.get({ query: { q: 'Brno' } })
    expect(error).toBeNull()
    expect(data!.suggestions).toHaveLength(1)
    expect(data!.suggestions[0]).toMatchObject({
      id: 'place-brno-123',
      city: 'Brno',
      region: 'South Moravian Region',
      country: 'Czech Republic',
      street: null,
    })

    const cached = await redis.get('loc:place-brno-123')
    expect(JSON.parse(cached!)).toMatchObject({ city: 'Brno', country: 'Czech Republic' })
  })

  it('skips features missing country', async () => {
    mockGeoapify([
      geoapifyFeature('place-1', { country: null }),
      geoapifyFeature('place-2'),
    ])
    const { data } = await client.locations.autocomplete.get({ query: { q: 'test' } })
    expect(data!.suggestions).toHaveLength(1)
    expect(data!.suggestions[0]!.id).toBe('place-2')
  })

  it('skips features missing place_id', async () => {
    mockGeoapify([
      geoapifyFeature('place-1', { place_id: undefined }),
      geoapifyFeature('place-2'),
    ])
    const { data } = await client.locations.autocomplete.get({ query: { q: 'test' } })
    expect(data!.suggestions).toHaveLength(1)
    expect(data!.suggestions[0]!.id).toBe('place-2')
  })

  it('returns 502 when Geoapify is unreachable', async () => {
    spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'))
    const { error } = await client.locations.autocomplete.get({ query: { q: 'Brno' } })
    expect(error?.status).toBe(502)
  })

  it('returns 502 when Geoapify returns a non-OK status', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 }),
    )
    const { error } = await client.locations.autocomplete.get({ query: { q: 'Brno' } })
    expect(error?.status).toBe(502)
  })

  it('deduplicates features with the same city/region/country/street', async () => {
    mockGeoapify([
      geoapifyFeature('place-1'),
      geoapifyFeature('place-2'),
      geoapifyFeature('place-3', { city: 'Ostrava' }),
    ])
    const { data } = await client.locations.autocomplete.get({ query: { q: 'Brno' } })
    expect(data!.suggestions).toHaveLength(2)
    expect(data!.suggestions[0]!.id).toBe('place-1')
    expect(data!.suggestions[1]!.id).toBe('place-3')
  })

  it('returns empty suggestions array when Geoapify returns no features', async () => {
    mockGeoapify([])
    const { data } = await client.locations.autocomplete.get({ query: { q: 'zzz' } })
    expect(data!.suggestions).toEqual([])
  })
})

const fullApp = new Elysia()
  .use(errorsPlugin)
  .use(authRoutes)
  .use(usersRoutes)
  .use(profilesRoutes)
  .use(locationsRoutes)
const fullClient = treaty(fullApp)

let sessionCookie = ''
let profileId = ''

describe('POST /profiles/:id/locations', () => {
  beforeEach(async () => {
    await redis.flushdb()
    const signInRes = await auth.api.signInEmail({
      body: { email: 'alice@example.com', password: 'password123' },
      asResponse: true,
    })
    sessionCookie = signInRes.headers.get('set-cookie') ?? ''
    const { data: me } = await fullClient.users.me.get({ headers: { Cookie: sessionCookie } })
    profileId = me!.profiles[0]!.userProfileId
  })

  it('creates location from valid Redis-cached externalId', async () => {
    await redis.set(
      'loc:R86674',
      JSON.stringify({ country: 'Czech Republic', region: 'South Moravian Region', city: 'Brno', street: null }),
      'EX', 14400,
    )

    const { data, error } = await fullClient.profiles({ id: profileId }).locations.post(
      { externalId: 'R86674' },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error).toBeNull()
    expect(data!.city).toBe('Brno')
    expect(data!.country).toBe('Czech Republic')
  })

  it('returns 422 when externalId is not in Redis', async () => {
    const { error } = await fullClient.profiles({ id: profileId }).locations.post(
      { externalId: 'R99999' },
      { headers: { Cookie: sessionCookie } },
    )
    expect(error?.status).toBe(422)
  })
})
