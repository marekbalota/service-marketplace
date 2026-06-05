import { db } from '../../db'
import { locations, profileLocations } from '../../db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import type { LocationsModel } from './model'
import { BadGatewayError, ForbiddenError, NotFoundError, UnprocessableEntityError, AuthErrorMessages } from '../../lib/errors'
import { ProfilesService } from '../profiles/service'
import { redis } from '../../lib/redis'
import { env } from '../../lib/env'

export abstract class LocationsService {
  static async findByProfileId(profileId: string, accountId: string) {
    const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    return db
      .select({
        locationId: locations.locationId,
        country: locations.country,
        region: locations.region,
        city: locations.city,
        street: locations.street,
      })
      .from(profileLocations)
      .innerJoin(locations, eq(locations.locationId, profileLocations.locationId))
      .where(
        and(
          eq(profileLocations.userProfileId, profileId),
          isNull(profileLocations.deletedAt),
          isNull(locations.deletedAt),
        ),
      )
  }

  static async addToProfile(profileId: string, accountId: string, body: LocationsModel['addBody']) {
    const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const cached = await redis.get(`loc:${body.externalId}`)
    if (!cached) {
      throw new UnprocessableEntityError('Location suggestion expired, please search again')
    }
    let parsed: { country: string | null; region: string | null; city: string | null; street: string | null }
    try {
      parsed = JSON.parse(cached) as typeof parsed
    } catch {
      throw new UnprocessableEntityError('Location suggestion expired, please search again')
    }
    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(locations)
        .values(parsed)
        .returning()

      await tx
        .insert(profileLocations)
        .values({ userProfileId: profileId, locationId: inserted!.locationId })
        .onConflictDoNothing()

      return {
        locationId: inserted!.locationId,
        country: inserted!.country,
        region: inserted!.region,
        city: inserted!.city,
        street: inserted!.street,
      }
    })
  }

  static async removeFromProfile(profileId: string, accountId: string, locationId: string) {
    const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const [row] = await db
      .update(profileLocations)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(profileLocations.userProfileId, profileId),
          eq(profileLocations.locationId, locationId),
          isNull(profileLocations.deletedAt),
        ),
      )
      .returning()

    if (!row) throw new NotFoundError('Location not found in profile')
  }

  static async autocomplete(query: LocationsModel['autocompleteQuery'], lang = 'en') {
    const { q, limit = 5 } = query

    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete')
    url.searchParams.set('text', q)
    url.searchParams.set('lang', lang)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('apiKey', env.geoapifyApiKey)

    let rawData: { features: { properties: Record<string, unknown> }[] }
    try {
      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new BadGatewayError('Location search unavailable')
      }
      rawData = (await response.json()) as typeof rawData
    } catch {
      throw new BadGatewayError('Location search unavailable')
    }

    const suggestions = []
    const cacheWrites: Promise<unknown>[] = []
    const seen = new Set<string>()

    for (const feature of rawData.features) {
      const p = feature.properties
      const id = p.place_id as string | undefined
      if (!id || !p.country) continue

      const country = (p.country as string) ?? null
      const region = (p.state as string) ?? null
      const city = (p.city as string) ?? null
      const street = (p.street as string) ?? null

      // Skip duplicate display entries — Geoapify returns the same place at
      // multiple administrative granularities (city, municipality, district…)
      const dedupeKey = `${street}|${city}|${region}|${country}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      cacheWrites.push(
        redis.set(`loc:${id}`, JSON.stringify({ country, region, city, street }), 'EX', 4 * 60 * 60),
      )

      suggestions.push({ id, street, city, region, country })
    }

    await Promise.all(cacheWrites)
    return { suggestions }
  }
}
