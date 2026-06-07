import { db } from '../../db'
import {
  posts,
  userProfiles,
  postCategories,
  categories,
  categoryTranslations,
  locations,
  favourites,
  profileLocations,
} from '../../db/schema'
import {
  eq,
  isNull,
  isNotNull,
  ilike,
  and,
  or,
  desc,
  asc,
  exists,
  sql,
  count,
  gte,
  lte,
  inArray,
  type SQL,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { PostsModel } from './model'
import { NotFoundError, ForbiddenError, UnprocessableEntityError, ErrorMessages, AuthErrorMessages } from '../../lib/errors'
import { redis } from '../../lib/redis'
import { resolveParentPlaceId, type ParentLevel } from '../../lib/geoapify'
import { ProfilesService } from '../profiles/service'
import { RBACService } from '../../lib/rbac/rbac-helper'
import { Permissions } from '@marketplace/shared'

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

const postSelect = (tx: DbOrTx, locale: string = 'en') => {
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
      bannedAt: posts.bannedAt,
      banReason: posts.banReason,
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
    })
    .from(posts)
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
    .groupBy(posts.postId, userProfiles.userProfileId, locations.locationId)
}

export abstract class PostsService {
  static async findAll(query: PostsModel['findAllQuery'], accountId?: string, locale = 'en') {
    const {
      search,
      type,
      categoryIds,
      sort,
      offset = 0,
      size,
      ratingMin,
      ratingMax,
      profileId,
      externalId,
    } = query

    if (profileId && accountId !== undefined) {
      const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
      if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)
    }

    // Resolve location filter from cache — hierarchical filtering via parent place_ids.
    // Each level column stores the canonical place_id at that level, so filtering at any
    // level uses a simple eq() on the corresponding column.
    let locationFilter: SQL | undefined
    if (externalId) {
      const cached = await redis.get(`loc:${externalId}`)
      if (cached) {
        const { city: filterCity, region: filterRegion, street: filterStreet } = JSON.parse(cached) as {
          city: string | null
          region: string | null
          street: string | null
        }
        if (filterStreet) {
          locationFilter = eq(locations.streetExternalId, externalId)
        } else if (filterCity) {
          locationFilter = eq(locations.cityExternalId, externalId)
        } else if (filterRegion) {
          locationFilter = eq(locations.regionExternalId, externalId)
        } else {
          locationFilter = eq(locations.countryExternalId, externalId)
        }
      } else {
        // Unknown externalId (not in cache) — return no results rather than unfiltered results
        locationFilter = sql`false`
      }
    }

    const orderBy =
      sort === 'price-low'
        ? asc(posts.price)
        : sort === 'price-high'
          ? desc(posts.price)
          : sort === 'name'
            ? asc(posts.postTitle)
            : sort === 'reviews-most'
              ? desc(sql`(SELECT COUNT(*) FROM reviews r WHERE r.post_id = ${posts.postId})`)
              : sort === 'reviews-least'
                ? asc(sql`(SELECT COUNT(*) FROM reviews r WHERE r.post_id = ${posts.postId})`)
                : desc(posts.createdAt)

    return db.transaction(async (tx) => {
      // Subquery for average rating
      const avgRatingSubquery = sql<number>`(
        SELECT COALESCE(AVG(r.rating), 0)
        FROM reviews r
        WHERE r.post_id = ${posts.postId}
      )`

      // Build rating filter condition
      const ratingConditions =
        ratingMin !== undefined || ratingMax !== undefined
          ? and(
              ratingMin !== undefined ? gte(avgRatingSubquery, sql`${ratingMin}`) : undefined,
              ratingMax !== undefined ? lte(avgRatingSubquery, sql`${ratingMax}`) : undefined,
            )
          : undefined

      const conditions = and(
        isNull(posts.deletedAt),
        isNull(posts.bannedAt),
        search
          ? or(
              ilike(posts.postTitle, `%${search}%`),
              ilike(posts.description, `%${search}%`),
              ilike(userProfiles.name, `%${search}%`),
            )
          : undefined,
        type ? eq(posts.postType, type) : undefined,
        categoryIds && categoryIds.length > 0
          ? exists(
              tx
                .select()
                .from(postCategories)
                .where(
                  and(
                    eq(postCategories.postId, posts.postId),
                    inArray(postCategories.categoryId, categoryIds),
                  ),
                ),
            )
          : undefined,
        ratingConditions,
        profileId
          ? exists(
              tx
                .select()
                .from(favourites)
                .where(
                  and(eq(favourites.postId, posts.postId), eq(favourites.userProfileId, profileId)),
                ),
            )
          : undefined,
        locationFilter,
      )

      const [countRow] = await tx
        .select({ total: count() })
        .from(posts)
        .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
        .leftJoin(locations, eq(posts.locationId, locations.locationId))
        .where(conditions)
      const total = countRow?.total ?? 0

      const q = postSelect(tx, locale).where(conditions).orderBy(orderBy).offset(offset)

      const rows = await (size !== undefined ? q.limit(size) : q)

      const items = rows.map(({ locationId, locationCity, locationCountry, ...rest }) => ({
        ...rest,
        location: locationId ? { locationId, city: locationCity, country: locationCountry } : null,
      }))

      return {
        items,
        total,
        totalPages: size !== undefined ? Math.ceil(total / size) : 1,
      }
    })
  }

  static async countByProfile(profileId: string) {
    const [[activeRow], [archivedRow], [bannedRow]] = await Promise.all([
      db
        .select({ total: count() })
        .from(posts)
        .where(and(eq(posts.authorId, profileId), isNull(posts.deletedAt), isNull(posts.bannedAt))),
      db
        .select({ total: count() })
        .from(posts)
        .where(
          and(eq(posts.authorId, profileId), isNotNull(posts.deletedAt), isNull(posts.bannedAt)),
        ),
      db
        .select({ total: count() })
        .from(posts)
        .where(and(eq(posts.authorId, profileId), isNotNull(posts.bannedAt))),
    ])
    return {
      active: activeRow?.total ?? 0,
      archived: archivedRow?.total ?? 0,
      banned: bannedRow?.total ?? 0,
    }
  }

  static async findByProfile(
    profileId: string,
    query: PostsModel['findByProfileQuery'],
    locale = 'en',
  ) {
    const { offset = 0, size, status = 'active' } = query

    const statusConditions: Record<'active' | 'archived' | 'banned', ReturnType<typeof and>> = {
      banned: isNotNull(posts.bannedAt),
      archived: and(isNull(posts.bannedAt), isNotNull(posts.deletedAt)),
      active: and(isNull(posts.bannedAt), isNull(posts.deletedAt)),
    }
    const statusCondition = statusConditions[status]

    return db.transaction(async (tx) => {
      const [countRow] = await tx
        .select({ total: count() })
        .from(posts)
        .where(and(eq(posts.authorId, profileId), statusCondition))

      const total = countRow?.total ?? 0

      const q = postSelect(tx, locale)
        .where(and(eq(posts.authorId, profileId), statusCondition))
        .orderBy(desc(posts.createdAt))
        .offset(offset)

      const rows = await (size !== undefined ? q.limit(size) : q)

      const items = rows.map(({ locationId, locationCity, locationCountry, ...rest }) => ({
        ...rest,
        location: locationId ? { locationId, city: locationCity, country: locationCountry } : null,
      }))

      return {
        items,
        total,
        totalPages: size !== undefined ? Math.ceil(total / size) : 1,
      }
    })
  }

  static async findById(id: string, locale = 'en', accountId?: string) {
    const requested = alias(categoryTranslations, 'cat_requested')
    const fallback = alias(categoryTranslations, 'cat_fallback')

    const [row] = await db
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
        bannedAt: posts.bannedAt,
        banReason: posts.banReason,
        locationId: locations.locationId,
        locationCountry: locations.country,
        locationRegion: locations.region,
        locationCity: locations.city,
        locationStreet: locations.street,
        categories: sql<{ categoryId: string; name: string }[]>`
          coalesce(
            json_agg(
              json_build_object('categoryId', ${categories.categoryId}, 'name', COALESCE(${requested.name}, ${fallback.name}))
            ) filter (where ${categories.categoryId} is not null),
            '[]'::json
          )
        `,
        reviews: sql<
          {
            reviewId: string
            rating: number
            reviewDescription: string | null
            reviewerId: string
            reviewerName: string
            createdAt: Date
            images: { reviewImageId: string; link: string; name: string }[]
          }[]
        >`
          coalesce(
            (select json_agg(json_build_object(
              'reviewId',          r.review_id,
              'rating',            r.rating,
              'reviewDescription', r.review_description,
              'reviewerId',        r.reviewer_id,
              'reviewerName',      rp.name,
              'createdAt',         r.created_at,
              'images',            coalesce(
                (select json_agg(json_build_object(
                  'reviewImageId', ri.review_image_id,
                  'link',          ri.link,
                  'name',          ri.name
                ) order by ri.created_at)
                from review_images ri
                where ri.review_id = r.review_id and ri.deleted_at is null),
                '[]'::json
              )
            ) order by r.created_at desc)
            from reviews r
            join user_profiles rp on r.reviewer_id = rp.user_profile_id
            where r.post_id = ${posts.postId} and r.deleted_at is null),
            '[]'::json
          )
        `,
        averageRating: sql<number | null>`(
          SELECT AVG(r.rating)::float8
          FROM reviews r
          WHERE r.post_id = ${posts.postId}
        )`,
      })
      .from(posts)
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
      .where(and(eq(posts.postId, id), isNull(posts.deletedAt)))
      .groupBy(posts.postId, userProfiles.userProfileId, locations.locationId)
      .limit(1)

    if (!row) {
      throw new NotFoundError(ErrorMessages.postNotFound)
    }

    if (row.bannedAt) {
      if (!accountId) throw new NotFoundError(ErrorMessages.postNotFound)

      const [profileIds, userPermissions] = await Promise.all([
        ProfilesService.getProfileIdsByAccount(accountId),
        RBACService.getUserPermissions(accountId),
      ])

      const isOwner = profileIds.includes(row.authorId)
      const isAdmin = userPermissions.includes(Permissions.AdminPostsDeleteAny)

      if (!isOwner && !isAdmin) throw new NotFoundError(ErrorMessages.postNotFound)
    }

    const location = row.locationId
      ? {
          locationId: row.locationId,
          country: row.locationCountry,
          region: row.locationRegion,
          city: row.locationCity,
          street: row.locationStreet,
        }
      : null

    const {
      locationId,
      locationCountry,
      locationRegion,
      locationCity,
      locationStreet,
      averageRating,
      ...rest
    } = row
    return { ...rest, location, averageRating, reviewCount: row.reviews.length }
  }

  static async create(body: PostsModel['createBody']) {
    const { categoryIds, location, locationId, ...postValues } = body

    return db.transaction(async (tx) => {
      let resolvedLocationId: string | undefined = locationId ?? undefined

      if (location?.externalId) {
        const cached = await redis.get(`loc:${location.externalId}`)
        if (!cached) {
          throw new UnprocessableEntityError('Location suggestion expired, please search again')
        }
        let parsed: { country: string | null; region: string | null; city: string | null; street: string | null; lang?: string }
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

        const [streetExternalId, cityExternalId, regionExternalId, countryExternalId] = await Promise.all(
          (['street', 'city', 'region', 'country'] as const).map(async (col) => {
            if (level === col) return location.externalId
            if (col === 'street') return null
            const name = parsed[col]
            if (!name) return null
            return resolveParentPlaceId(name, col, colContextCountry[col] ?? undefined, lang)
          }),
        )

        const [insertedLocation] = await tx
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
          .returning({ locationId: locations.locationId })
        resolvedLocationId = insertedLocation!.locationId

        await tx
          .insert(profileLocations)
          .values({ userProfileId: postValues.authorId, locationId: resolvedLocationId })
          .onConflictDoNothing()
      }

      const [inserted] = await tx
        .insert(posts)
        .values({ ...postValues, locationId: resolvedLocationId })
        .returning()

      if (categoryIds && categoryIds.length > 0) {
        await tx.insert(postCategories).values(
          categoryIds.map((categoryId) => ({
            postId: inserted!.postId,
            categoryId,
          })),
        )
      }

      return inserted!
    })
  }

  static async update(id: string, body: PostsModel['updateBody']) {
    const { categoryIds, location, locationId, ...updateValues } = body

    return db.transaction(async (tx) => {
      let resolvedLocationId: string | null | undefined = locationId

      if (location?.externalId) {
        const cached = await redis.get(`loc:${location.externalId}`)
        if (!cached) {
          throw new UnprocessableEntityError('Location suggestion expired, please search again')
        }
        let parsed: { country: string | null; region: string | null; city: string | null; street: string | null; lang?: string }
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

        const [streetExternalId, cityExternalId, regionExternalId, countryExternalId] = await Promise.all(
          (['street', 'city', 'region', 'country'] as const).map(async (col) => {
            if (level === col) return location.externalId
            if (col === 'street') return null
            const name = parsed[col]
            if (!name) return null
            return resolveParentPlaceId(name, col, colContextCountry[col] ?? undefined, lang)
          }),
        )

        const [insertedLocation] = await tx
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
          .returning({ locationId: locations.locationId })
        resolvedLocationId = insertedLocation!.locationId
      }

      const [updated] = await tx
        .update(posts)
        .set({
          ...updateValues,
          ...(resolvedLocationId !== undefined ? { locationId: resolvedLocationId } : {}),
        })
        .where(and(eq(posts.postId, id), isNull(posts.deletedAt)))
        .returning()

      if (!updated) throw new NotFoundError(ErrorMessages.postNotFound)

      let updatedCategories: string[]

      if (categoryIds !== undefined) {
        await tx.delete(postCategories).where(eq(postCategories.postId, id))

        if (categoryIds.length > 0) {
          updatedCategories = await tx
            .insert(postCategories)
            .values(categoryIds.map((categoryId) => ({ postId: id, categoryId })))
            .returning({ categoryId: postCategories.categoryId })
            .then((rows) => rows.map((r) => r.categoryId))
        } else {
          updatedCategories = []
        }
      } else {
        updatedCategories = await tx
          .select({ categoryId: postCategories.categoryId })
          .from(postCategories)
          .where(eq(postCategories.postId, id))
          .then((rows) => rows.map((r) => r.categoryId))
      }

      return {
        postId: updated.postId,
        postTitle: updated.postTitle,
        description: updated.description,
        postType: updated.postType,
        price: updated.price,
        rateType: updated.rateType,
        categoryIds: updatedCategories,
      }
    })
  }

  static async delete(id: string) {
    const [deleted] = await db
      .update(posts)
      .set({ deletedAt: new Date() })
      .where(and(eq(posts.postId, id), isNull(posts.deletedAt)))
      .returning({ postId: posts.postId })

    if (!deleted) {
      throw new NotFoundError(ErrorMessages.postNotFound)
    }

    return true
  }

  static async createWithPermissionCheck(accountId: string, body: PostsModel['createBody']) {
    // Verify the account owns the profile they're posting as
    const owned = await ProfilesService.isProfileOwnedByAccount(body.authorId, accountId)
    if (!owned) {
      throw new ForbiddenError(AuthErrorMessages.forbidden)
    }

    return this.create(body)
  }

  static async updateWithPermissionCheck(
    accountId: string,
    id: string,
    body: PostsModel['updateBody'],
  ) {
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.postId, id), isNull(posts.deletedAt), isNull(posts.bannedAt)),
      columns: { authorId: true },
    })

    if (!post) {
      throw new NotFoundError(ErrorMessages.postNotFound)
    }

    const profileIds = await ProfilesService.getProfileIdsByAccount(accountId)
    const isOwner = profileIds.includes(post.authorId)

    if (!isOwner) {
      throw new ForbiddenError(AuthErrorMessages.forbidden)
    }

    return this.update(id, body)
  }

  static async deleteWithPermissionCheck(accountId: string, id: string) {
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.postId, id), isNull(posts.deletedAt), isNull(posts.bannedAt)),
      columns: { authorId: true },
    })

    if (!post) {
      throw new NotFoundError(ErrorMessages.postNotFound)
    }

    const profileIds = await ProfilesService.getProfileIdsByAccount(accountId)
    const isOwner = profileIds.includes(post.authorId)

    if (!isOwner) {
      throw new ForbiddenError(AuthErrorMessages.forbidden)
    }

    await this.delete(id)
  }
}
