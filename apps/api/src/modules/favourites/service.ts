import { db } from '../../db'
import { favourites, posts, userProfiles, postCategories, categories, locations } from '../../db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import type { FavouritesModel } from './model'

export abstract class FavouritesService {
  private static favouriteSelect = (tx: typeof db) => tx
    .select({
      postId:      posts.postId,
      postTitle:   posts.postTitle,
      description: posts.description,
      postType:    posts.postType,
      price:       posts.price,
      rateType:    posts.rateType,
      createdAt:   posts.createdAt,
      authorId:    posts.authorId,
      authorName:  userProfiles.name,
      categories:  sql<{ categoryId: string; name: string }[]>`
        coalesce(
          json_agg(
            json_build_object('categoryId', ${categories.categoryId}, 'name', ${categories.name})
          ) filter (where ${categories.categoryId} is not null),
          '[]'::json
        )
      `,
      locationId:      locations.locationId,
      locationCity:    locations.city,
      locationCountry: locations.country,
      favouriteCreatedAt: favourites.createdAt,
    })
    .from(favourites)
    .innerJoin(posts, eq(favourites.postId, posts.postId))
    .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
    .leftJoin(locations, eq(posts.locationId, locations.locationId))
    .leftJoin(postCategories, eq(posts.postId, postCategories.postId))
    .leftJoin(categories, eq(postCategories.categoryId, categories.categoryId))
    .groupBy(posts.postId, userProfiles.userProfileId, locations.locationId, favourites.createdAt)

  static async findAllByProfile(profileId: string): Promise<FavouritesModel['findAllResponse']> {
    const rows = await this.favouriteSelect(db)
      .where(
        and(
          eq(favourites.userProfileId, profileId),
          isNull(favourites.deletedAt),
          isNull(posts.deletedAt),
        ),
      )
      .orderBy(sql`${favourites.createdAt} desc`)

    const items = rows.map(({ locationId, locationCity, locationCountry, favouriteCreatedAt, ...rest }) => ({
      ...rest,
      location: locationId ? { locationId, city: locationCity, country: locationCountry } : null,
    }))

    return {
      items,
      total: items.length,
    }
  }

  static async addFavourite(userProfileId: string, postId: string): Promise<FavouritesModel['addResponse'] | null> {
    // Check if post exists and is not deleted
    const [post] = await db
      .select({ postId: posts.postId })
      .from(posts)
      .where(and(eq(posts.postId, postId), isNull(posts.deletedAt)))
      .limit(1)

    if (!post) {
      return null
    }

    // Check if already favourited (including soft-deleted)
    const [existing] = await db
      .select({ deletedAt: favourites.deletedAt })
      .from(favourites)
      .where(and(eq(favourites.userProfileId, userProfileId), eq(favourites.postId, postId)))
      .limit(1)

    if (existing) {
      if (existing.deletedAt === null) {
        // Already favourited, return existing
        const [row] = await db
          .select({
            userProfileId: favourites.userProfileId,
            postId:        favourites.postId,
            createdAt:     favourites.createdAt,
          })
          .from(favourites)
          .where(and(eq(favourites.userProfileId, userProfileId), eq(favourites.postId, postId)))
          .limit(1)
        return row ?? null
      }

      // Restore soft-deleted favourite
      const [restored] = await db
        .update(favourites)
        .set({ deletedAt: null })
        .where(and(eq(favourites.userProfileId, userProfileId), eq(favourites.postId, postId)))
        .returning({
          userProfileId: favourites.userProfileId,
          postId:        favourites.postId,
          createdAt:     favourites.createdAt,
        })

      return restored ?? null
    }

    // Create new favourite
    const [inserted] = await db
      .insert(favourites)
      .values({ userProfileId, postId })
      .returning({
        userProfileId: favourites.userProfileId,
        postId:        favourites.postId,
        createdAt:     favourites.createdAt,
      })

    return inserted ?? null
  }

  static async removeFavourite(userProfileId: string, postId: string): Promise<boolean> {
    const [result] = await db
      .update(favourites)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(favourites.userProfileId, userProfileId),
          eq(favourites.postId, postId),
          isNull(favourites.deletedAt),
        ),
      )
      .returning({ userProfileId: favourites.userProfileId })

    return !!result
  }

  static async isFavourite(userProfileId: string, postId: string): Promise<boolean> {
    const [row] = await db
      .select({ userProfileId: favourites.userProfileId })
      .from(favourites)
      .where(
        and(
          eq(favourites.userProfileId, userProfileId),
          eq(favourites.postId, postId),
          isNull(favourites.deletedAt),
        ),
      )
      .limit(1)

    return !!row
  }

  static async checkFavouritesForProfile(userProfileId: string, postIds: string[]): Promise<Set<string>> {
    if (postIds.length === 0) {
      return new Set()
    }

    const rows = await db
      .select({ postId: favourites.postId })
      .from(favourites)
      .where(
        and(
          eq(favourites.userProfileId, userProfileId),
          sql`${favourites.postId} = ANY(${postIds})`,
          isNull(favourites.deletedAt),
        ),
      )

    return new Set(rows.map(r => r.postId))
  }
}
