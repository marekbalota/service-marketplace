import { db } from '../../db'
import { locations, posts } from '../../db/schema'
import { eq, isNull, and, asc, sql } from 'drizzle-orm'
import type { LocationsModel } from './model'
import { ForbiddenError, AuthErrorMessages } from '../../lib/errors'
import { ProfilesService } from '../profiles/service'

export abstract class LocationsService {
  static async findByProfileId(profileId: string, accountId: string) {
    const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    return db
      .selectDistinct({
        locationId:  locations.locationId,
        country:     locations.country,
        region:      locations.region,
        city:        locations.city,
        street:      locations.street,
        houseNumber: locations.houseNumber,
      })
      .from(locations)
      .innerJoin(posts, eq(posts.locationId, locations.locationId))
      .where(
        and(
          eq(posts.authorId, profileId),
          isNull(posts.deletedAt),
          isNull(locations.deletedAt),
        ),
      )
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
