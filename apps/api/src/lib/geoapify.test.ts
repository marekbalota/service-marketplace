import { describe, it, expect, spyOn, beforeEach } from 'bun:test'
import { fetchGeoapifyFeatures, resolveParentPlaceId } from './geoapify'
import { redis } from './redis'
import { BadGatewayError } from './errors'

function mockFetch(features: unknown[]) {
  return spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify({ type: 'FeatureCollection', features }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('fetchGeoapifyFeatures', () => {
  it('returns features from a successful response', async () => {
    const features = [{ properties: { place_id: 'R1', city: 'Brno', country: 'Czech Republic' } }]
    mockFetch(features)
    const result = await fetchGeoapifyFeatures('Brno', 'en', 5)
    expect(result).toEqual(features)
  })

  it('throws BadGatewayError when response status is not OK', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('{}', { status: 429 }),
    )
    await expect(fetchGeoapifyFeatures('Brno', 'en', 5)).rejects.toBeInstanceOf(BadGatewayError)
  })

  it('throws BadGatewayError when fetch throws a network error', async () => {
    spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'))
    await expect(fetchGeoapifyFeatures('Brno', 'en', 5)).rejects.toBeInstanceOf(BadGatewayError)
  })
})

describe('resolveParentPlaceId', () => {
  beforeEach(async () => {
    await redis.del('parent:city:Brno:Czech Republic')
    await redis.del('parent:region:South Moravian Region:Czech Republic')
    await redis.del('parent:country:Czech Republic')
  })

  it('returns cached place_id without calling Geoapify', async () => {
    await redis.set('parent:city:Brno:Czech Republic', 'cached_id_123', 'EX', 3600)
    // Clear any calls accumulated from the fetchGeoapifyFeatures tests above
    const fetchSpy = spyOn(globalThis, 'fetch').mockClear()
    const result = await resolveParentPlaceId('Brno', 'city', 'Czech Republic')
    expect(result).toBe('cached_id_123')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches from Geoapify, caches the result, and returns the place_id', async () => {
    mockFetch([
      { properties: { place_id: 'brno_id', city: 'Brno', state: 'South Moravian Region', street: null, country: 'Czech Republic' } },
    ])
    const result = await resolveParentPlaceId('Brno', 'city', 'Czech Republic')
    expect(result).toBe('brno_id')
    const cached = await redis.get('parent:city:Brno:Czech Republic')
    expect(cached).toBe('brno_id')
  })

  it('returns null when no feature matches the given type', async () => {
    // Feature has city set, so it won't match a country-level query
    mockFetch([
      { properties: { place_id: 'R1', city: 'Brno', state: null, street: null, country: 'Czech Republic' } },
    ])
    const result = await resolveParentPlaceId('Czech Republic', 'country')
    expect(result).toBeNull()
  })

  it('returns null when Geoapify returns no features', async () => {
    mockFetch([])
    const result = await resolveParentPlaceId('Nonexistent', 'city', 'Czech Republic')
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network error'))
    const result = await resolveParentPlaceId('Brno', 'city', 'Czech Republic')
    expect(result).toBeNull()
  })

  it('matches region-level features correctly', async () => {
    mockFetch([
      { properties: { place_id: 'region_id', city: null, state: 'South Moravian Region', street: null, country: 'Czech Republic' } },
    ])
    const result = await resolveParentPlaceId('South Moravian Region', 'region', 'Czech Republic')
    expect(result).toBe('region_id')
  })
})
