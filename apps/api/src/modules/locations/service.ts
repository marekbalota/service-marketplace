import { db } from '../../db'
import { locations, profileLocations } from '../../db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import type { LocationsModel } from './model'
import {
  BadGatewayError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  AuthErrorMessages,
} from '../../lib/errors'
import { ProfilesService } from '../profiles/service'
import { redis } from '../../lib/redis'
import {
  fetchGeoapifyFeatures,
  resolveParentPlaceId,
  type GeoProps,
  type ParentLevel,
} from '../../lib/geoapify'

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
    let parsed: {
      country: string | null
      region: string | null
      city: string | null
      street: string | null
      lang?: string
    }
    try {
      parsed = JSON.parse(cached) as typeof parsed
    } catch {
      throw new UnprocessableEntityError('Location suggestion expired, please search again')
    }

    const lang = parsed.lang ?? 'en'
    const allLevels = ['street', 'city', 'region', 'country'] as const
    const level = allLevels.find((l) => parsed[l] != null) ?? 'country'

    const colContextCountry: Record<ParentLevel, string | null> = {
      city: parsed.country,
      region: parsed.country,
      country: null,
    }

    const [streetExternalId, cityExternalId, regionExternalId, countryExternalId] =
      await Promise.all(
        (['street', 'city', 'region', 'country'] as const).map(async (col) => {
          if (level === col) return body.externalId
          if (col === 'street') return null
          const name = parsed[col]
          if (!name) return null
          return resolveParentPlaceId(name, col, colContextCountry[col] ?? undefined, lang)
        }),
      )

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(locations)
        .values({
          city: parsed.city,
          region: parsed.region,
          country: parsed.country,
          street: parsed.street,
          streetExternalId,
          cityExternalId,
          regionExternalId,
          countryExternalId,
        })
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

    let features: { properties: GeoProps }[]
    try {
      features = await fetchGeoapifyFeatures(q, lang, limit)
    } catch {
      throw new BadGatewayError('Location search unavailable')
    }

    const suggestions = []
    const cacheWrites: Promise<unknown>[] = []
    const seen = new Set<string>()

    for (const feature of features) {
      const p = feature.properties
      const id = p.place_id as string | undefined
      if (!id || !p.country) continue

      const country = (p.country as string) ?? null
      const region = (p.state as string) ?? null
      const city = (p.city as string) ?? null
      const street = (p.street as string) ?? null

      // Deduplicate by localized display string (Geoapify returns the same place at multiple admin levels)
      const dedupeKey = `${street}|${city}|${region}|${country}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      cacheWrites.push(
        redis.set(
          `loc:${id}`,
          JSON.stringify({ country, region, city, street, lang }),
          'EX',
          4 * 60 * 60,
        ),
      )

      suggestions.push({ id, street, city, region, country })
    }

    await Promise.all(cacheWrites)
    return { suggestions }
  }
}
