import { BadGatewayError } from './errors'
import { redis } from './redis'
import { env } from './env'

export type GeoProps = Record<string, unknown>
export type ParentLevel = 'city' | 'region' | 'country'

/** Fetch Geoapify autocomplete features for the given text and language. */
export async function fetchGeoapifyFeatures(
  q: string,
  lang: string,
  limit: number,
): Promise<{ properties: GeoProps }[]> {
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
  url.searchParams.set('text', q)
  url.searchParams.set('lang', lang)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('apiKey', env.geoapifyApiKey)

  try {
    const response = await fetch(url.toString())
    if (!response.ok) throw new BadGatewayError('Location search unavailable')
    const data = (await response.json()) as { features: { properties: GeoProps }[] }
    return data.features
  } catch (err) {
    if (err instanceof BadGatewayError) throw err
    throw new BadGatewayError('Location search unavailable')
  }
}

/**
 * Resolve the Geoapify place_id for a parent administrative region or country.
 * Results are cached in Redis for 24 hours to avoid repeated API calls.
 */
export async function resolveParentPlaceId(
  name: string,
  type: ParentLevel,
  contextCountry?: string,
  lang = 'en',
): Promise<string | null> {
  const cacheKey = `parent:${type}:${name}${contextCountry ? `:${contextCountry}` : ''}`
  const cached = await redis.get(cacheKey)
  if (cached) return cached

  const query = contextCountry ? `${name} ${contextCountry}` : name
  try {
    const features = await fetchGeoapifyFeatures(query, lang, 5)
    const match = features.find((f) => {
      const p = f.properties
      if (type === 'city') return p.street == null && p.city === name
      if (type === 'region') return p.street == null && p.city == null && p.state === name
      if (type === 'country')
        return p.street == null && p.city == null && p.state == null && p.country === name
      return false
    })
    if (!match?.properties.place_id) return null
    const placeId = match.properties.place_id as string
    await redis.set(cacheKey, placeId, 'EX', 24 * 60 * 60)
    return placeId
  } catch {
    return null
  }
}
