import { db } from '../../db'
import { locations, posts } from '../../db/schema'
import { eq, isNull, and } from 'drizzle-orm'

export abstract class LocationsService {
  static async findByProfileId(profileId: string) {
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
}
