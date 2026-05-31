import { db } from '../../db'
import {
  favourites,
  posts,
  userProfiles,
  postCategories,
  categories,
  categoryTranslations,
  locations,
} from '../../db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { FavouritesModel } from './model'
import {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ErrorMessages,
  AuthErrorMessages,
} from '../../lib/errors'
import { ProfilesService } from '../profiles/service'

export abstract class FavouritesService {
  private static favouriteSelect = (tx: typeof db, locale: string = 'en') => {
    const requested = alias(categoryTranslations, 'cat_requested')
    const fallback = alias(categoryTranslations, 'cat_fallback')

    return tx
      .select({
        postId: posts.postId,
        postTitle: posts.postTitle,
        description: posts.description,
        postType: posts.postType,
        price: posts.price,
        rateType: posts.rateType,
        createdAt: posts.createdAt,
        authorId: posts.authorId,
        authorName: userProfiles.name,
        categories: sql<{ categoryId: string; name: string }[]>`
        coalesce(
          json_agg(
            json_build_object('categoryId', ${categories.categoryId}, 'name', COALESCE(${requested.name}, ${fallback.name}))
          ) filter (where ${categories.categoryId} is not null),
          '[]'::json
        )
      `,
        locationId: locations.locationId,
        locationCity: locations.city,
        locationCountry: locations.country,
        favouriteCreatedAt: favourites.createdAt,
      })
      .from(favourites)
      .innerJoin(posts, eq(favourites.postId, posts.postId))
      .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
      .leftJoin(locations, eq(posts.locationId, locations.locationId))
      .leftJoin(postCategories, eq(posts.postId, postCategories.postId))
      .leftJoin(categories, eq(postCategories.categoryId, categories.categoryId))
      .leftJoin(
        fallback,
        and(eq(fallback.categoryId, categories.categoryId), eq(fallback.locale, 'en')),
      )
      .leftJoin(
        requested,
        and(eq(requested.categoryId, categories.categoryId), eq(requested.locale, locale)),
      )
      .groupBy(posts.postId, userProfiles.userProfileId, locations.locationId, favourites.createdAt)
  }

  static async findAllByProfile(
    profileId: string,
    locale = 'en',
  ): Promise<FavouritesModel['findAllResponse']> {
    const rows = await this.favouriteSelect(db, locale)
      .where(and(eq(favourites.userProfileId, profileId), isNull(posts.deletedAt)))
      .orderBy(sql`${favourites.createdAt} desc`)

    const items = rows.map(
      ({ locationId, locationCity, locationCountry, favouriteCreatedAt, ...rest }) => ({
        ...rest,
        location: locationId ? { locationId, city: locationCity, country: locationCountry } : null,
      }),
    )

    return { items, total: items.length }
  }

  /**
   * @throws NotFoundError if the post doesn't exist or is deleted
   * @throws ConflictError if the post is already favourited
   */
  static async addFavourite(
    userProfileId: string,
    postId: string,
  ): Promise<FavouritesModel['addResponse']> {
    const [post] = await db
      .select({ postId: posts.postId })
      .from(posts)
      .where(and(eq(posts.postId, postId), isNull(posts.deletedAt)))
      .limit(1)

    if (!post) throw new NotFoundError(ErrorMessages.postNotFound)

    const [existing] = await db
      .select({ postId: favourites.postId })
      .from(favourites)
      .where(and(eq(favourites.userProfileId, userProfileId), eq(favourites.postId, postId)))
      .limit(1)

    if (existing) throw new ConflictError(ErrorMessages.alreadyFavourited)

    const [inserted] = await db.insert(favourites).values({ userProfileId, postId }).returning({
      userProfileId: favourites.userProfileId,
      postId: favourites.postId,
      createdAt: favourites.createdAt,
    })
    return inserted!
  }

  /**
   * @throws NotFoundError if there is no favourite to remove
   */
  static async removeFavourite(userProfileId: string, postId: string): Promise<void> {
    const [result] = await db
      .delete(favourites)
      .where(and(eq(favourites.userProfileId, userProfileId), eq(favourites.postId, postId)))
      .returning({ userProfileId: favourites.userProfileId })

    if (!result) throw new NotFoundError(ErrorMessages.favouriteNotFound)
  }

  // ── Account + profile wrappers (validate ownership, then delegate) ──────

  private static async assertOwnership(profileId: string, accountId: string): Promise<void> {
    const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)
  }

  static async findAllForProfile(
    accountId: string,
    profileId: string,
    locale = 'en',
  ): Promise<FavouritesModel['findAllResponse']> {
    await this.assertOwnership(profileId, accountId)
    return this.findAllByProfile(profileId, locale)
  }

  static async addFavouriteForProfile(
    accountId: string,
    profileId: string,
    postId: string,
  ): Promise<FavouritesModel['addResponse']> {
    await this.assertOwnership(profileId, accountId)
    return this.addFavourite(profileId, postId)
  }

  static async removeFavouriteForProfile(
    accountId: string,
    profileId: string,
    postId: string,
  ): Promise<void> {
    await this.assertOwnership(profileId, accountId)
    await this.removeFavourite(profileId, postId)
  }
}
