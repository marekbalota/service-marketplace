import { db } from '../../db'
import { locations, posts, profileLocations } from '../../db/schema'
import { eq, isNull, and, asc, sql } from 'drizzle-orm'
import type { LocationsModel } from './model'
import { ForbiddenError, NotFoundError, AuthErrorMessages } from '../../lib/errors'
import { ProfilesService } from '../profiles/service'

export abstract class LocationsService {
  static async findByProfileId(profileId: string, accountId: string) {
    const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    return db
      .select({
        locationId:  locations.locationId,
        country:     locations.country,
        region:      locations.region,
        city:        locations.city,
        street:      locations.street,
        houseNumber: locations.houseNumber,
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

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(locations)
        .values(body)
        .returning()

      await tx
        .insert(profileLocations)
        .values({ userProfileId: profileId, locationId: inserted!.locationId })
        .onConflictDoNothing()

      return {
        locationId:  inserted!.locationId,
        country:     inserted!.country,
        region:      inserted!.region,
        city:        inserted!.city,
        street:      inserted!.street,
        houseNumber: inserted!.houseNumber,
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

  static async findDistinct(query: LocationsModel['distinctQuery']) {
    const { field, country, region } = query

    const column =
      field === 'country' ? locations.country :
      field === 'region'  ? locations.region  :
                            locations.city

    const rows = await db
      .selectDistinct({ value: column })
      .from(locations)
      .innerJoin(posts, eq(posts.locationId, locations.locationId))
      .where(and(
        isNull(posts.deletedAt),
        isNull(locations.deletedAt),
        country ? sql`unaccent(${locations.country}) ILIKE unaccent(${country})` : undefined,
        region  ? sql`unaccent(${locations.region})  ILIKE unaccent(${region})`  : undefined,
      ))
      .orderBy(asc(column))

    return {
      values: rows.map(r => r.value).filter((v): v is string => v !== null),
    }
  }
}
