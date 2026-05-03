import { db } from "../../db";
import { posts, userProfiles, postCategories, categories, locations, favourites } from "../../db/schema";
import { eq, isNull, isNotNull, ilike, and, or, desc, asc, exists, sql, count, gte, lte, inArray } from "drizzle-orm";
import type { PostsModel } from "./model";
import { NotFoundError, ForbiddenError, ErrorMessages, AuthErrorMessages } from "../../lib/errors";
import { ProfilesService } from "../profiles/service";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

const postSelect = (tx: DbOrTx) => tx
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
  })
  .from(posts)
  .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
  .leftJoin(locations, eq(posts.locationId, locations.locationId))
  .leftJoin(postCategories, eq(posts.postId, postCategories.postId))
  .leftJoin(categories, eq(postCategories.categoryId, categories.categoryId))
  .groupBy(posts.postId, userProfiles.userProfileId, locations.locationId);

export abstract class PostsService {
  static async findAll(query: PostsModel['findAllQuery'], accountId?: string) {
    const { search, type, categoryIds, sort, offset = 0, size, ratingMin, ratingMax, profileId } = query;

    if (profileId && accountId !== undefined) {
      const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
      if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)
    }

    const orderBy =
      sort === 'price-low'  ? asc(posts.price)     :
      sort === 'price-high' ? desc(posts.price)    :
      sort === 'name'       ? asc(posts.postTitle) :
      sort === 'reviews-most'  ? desc(sql`(SELECT COUNT(*) FROM reviews r WHERE r.post_id = ${posts.postId} AND r.deleted_at IS NULL)`) :
      sort === 'reviews-least' ? asc(sql`(SELECT COUNT(*) FROM reviews r WHERE r.post_id = ${posts.postId} AND r.deleted_at IS NULL)`) :
      desc(posts.createdAt);

    return db.transaction(async (tx) => {
      // Subquery for average rating
      const avgRatingSubquery = sql<number>`(
        SELECT COALESCE(AVG(r.rating), 0)
        FROM reviews r
        WHERE r.post_id = ${posts.postId} AND r.deleted_at IS NULL
      )`;

      // Build rating filter condition
      const ratingConditions = (ratingMin !== undefined || ratingMax !== undefined)
        ? and(
            ratingMin !== undefined ? gte(avgRatingSubquery, sql`${ratingMin}`) : undefined,
            ratingMax !== undefined ? lte(avgRatingSubquery, sql`${ratingMax}`) : undefined,
          )
        : undefined;

      const conditions = and(
        isNull(posts.deletedAt),
        search
          ? or(
              ilike(posts.postTitle, `%${search}%`),
              ilike(posts.description, `%${search}%`),
              ilike(userProfiles.name, `%${search}%`),
              ilike(locations.city, `%${search}%`),
              ilike(locations.country, `%${search}%`),
            )
          : undefined,
        type       
          ? eq(posts.postType, type) : undefined,
        categoryIds && categoryIds.length > 0
          ? exists(
              tx.select().from(postCategories).where(
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
              tx.select().from(favourites).where(
                and(
                  eq(favourites.postId, posts.postId),
                  eq(favourites.userProfileId, profileId),
                ),
              ),
            )
          : undefined,
      );

      const [countRow] = await tx
        .select({ total: count() })
        .from(posts)
        .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
        .leftJoin(locations, eq(posts.locationId, locations.locationId))
        .where(conditions);
      const total = countRow?.total ?? 0;

      const q = postSelect(tx)
        .where(conditions)
        .orderBy(orderBy)
        .offset(offset);

      const rows = await (size !== undefined ? q.limit(size) : q);

      const items = rows.map(({ locationId, locationCity, locationCountry, ...rest }) => ({
        ...rest,
        location: locationId ? { locationId, city: locationCity, country: locationCountry } : null,
      }));

      return {
        items,
        total,
        totalPages: size !== undefined ? Math.ceil(total / size) : 1,
      };
    });
  }

  static async countByProfile(profileId: string) {
    const [[activeRow], [archivedRow]] = await Promise.all([
      db.select({ total: count() }).from(posts).where(and(eq(posts.authorId, profileId), isNull(posts.deletedAt))),
      db.select({ total: count() }).from(posts).where(and(eq(posts.authorId, profileId), isNotNull(posts.deletedAt))),
    ])
    return { active: activeRow?.total ?? 0, archived: archivedRow?.total ?? 0 }
  }

  static async findByProfile(profileId: string, query: PostsModel['findByProfileQuery']) {
    const { offset = 0, size, archived = false } = query

    const deletedCondition = archived ? isNotNull(posts.deletedAt) : isNull(posts.deletedAt)

    return db.transaction(async (tx) => {
      const [countRow] = await tx
        .select({ total: count() })
        .from(posts)
        .where(and(eq(posts.authorId, profileId), deletedCondition))

      const total = countRow?.total ?? 0

      const q = postSelect(tx)
        .where(and(eq(posts.authorId, profileId), deletedCondition))
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

  static async findById(id: string) {
    const [row] = await db
      .select({
        postId:              posts.postId,
        postTitle:           posts.postTitle,
        description:         posts.description,
        postType:            posts.postType,
        price:               posts.price,
        rateType:            posts.rateType,
        createdAt:           posts.createdAt,
        authorId:            posts.authorId,
        authorName:          userProfiles.name,
        locationId:          locations.locationId,
        locationCountry:     locations.country,
        locationRegion:      locations.region,
        locationCity:        locations.city,
        locationStreet:      locations.street,
        locationHouseNumber: locations.houseNumber,
        categories: sql<{ categoryId: string; name: string }[]>`
          coalesce(
            json_agg(
              json_build_object('categoryId', ${categories.categoryId}, 'name', ${categories.name})
            ) filter (where ${categories.categoryId} is not null),
            '[]'::json
          )
        `,
        reviews: sql<{ reviewId: string; rating: number; reviewDescription: string | null; reviewerId: string; reviewerName: string; createdAt: Date }[]>`
          coalesce(
            (select json_agg(json_build_object(
              'reviewId',          r.review_id,
              'rating',            r.rating,
              'reviewDescription', r.review_description,
              'reviewerId',        r.reviewer_id,
              'reviewerName',      rp.name,
              'createdAt',         r.created_at
            ) order by r.created_at desc)
            from reviews r
            join user_profiles rp on r.reviewer_id = rp.user_profile_id
            where r.post_id = ${posts.postId} and r.deleted_at is null),
            '[]'::json
          )
        `,
      })
      .from(posts)
      .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
      .leftJoin(locations, eq(posts.locationId, locations.locationId))
      .leftJoin(postCategories, eq(posts.postId, postCategories.postId))
      .leftJoin(categories, eq(postCategories.categoryId, categories.categoryId))
      .where(and(eq(posts.postId, id), isNull(posts.deletedAt)))
      .groupBy(posts.postId, userProfiles.userProfileId, locations.locationId)
      .limit(1);

    if (!row) {
      throw new NotFoundError(ErrorMessages.postNotFound);
    }

    const location = row.locationId ? {
      locationId:  row.locationId,
      country:     row.locationCountry,
      region:      row.locationRegion,
      city:        row.locationCity,
      street:      row.locationStreet,
      houseNumber: row.locationHouseNumber,
    } : null;

    const averageRating = row.reviews.length > 0
      ? row.reviews.reduce((sum, r) => sum + r.rating, 0) / row.reviews.length
      : null;

    const { locationId, locationCountry, locationRegion, locationCity, locationStreet, locationHouseNumber, ...rest } = row;
    return { ...rest, location, averageRating, reviewCount: row.reviews.length };
  }

  static async create(body: PostsModel['createBody']) {
    const { categoryIds, location, locationId, ...postValues } = body

    return db.transaction(async (tx) => {
      // locationId takes precedence; location creates a new row only when it has at least one field
      let resolvedLocationId: string | undefined = locationId

      const hasLocationData = location &&
        Object.values(location).some((v) => v !== undefined && v !== null && v !== '')

      if (hasLocationData) {
        const [insertedLocation] = await tx
          .insert(locations)
          .values(location!)
          .returning({ locationId: locations.locationId })
        resolvedLocationId = insertedLocation!.locationId
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
    const { categoryIds, ...updateValues } = body;

    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(posts)
        .set(updateValues)
        .where(and(eq(posts.postId, id), isNull(posts.deletedAt)))
        .returning();

      if (!updated) {
        throw new NotFoundError(ErrorMessages.postNotFound);
      }

      let updatedCategories: string[];

      if (categoryIds !== undefined) {
        await tx
          .delete(postCategories)
          .where(eq(postCategories.postId, id));

        if (categoryIds.length > 0) {
          updatedCategories = await tx
            .insert(postCategories)
            .values(categoryIds.map((categoryId) => ({ postId: id, categoryId })))
            .returning({ categoryId: postCategories.categoryId })
            .then(rows => rows.map(r => r.categoryId));
        } else {
          updatedCategories = [];
        }
      } else {
        updatedCategories = await tx
          .select({ categoryId: postCategories.categoryId })
          .from(postCategories)
          .where(eq(postCategories.postId, id))
          .then(rows => rows.map(r => r.categoryId));
      }

      return {
        postId:      updated.postId,
        postTitle:   updated.postTitle,
        description: updated.description,
        postType:    updated.postType,
        price:       updated.price,
        rateType:    updated.rateType,
        categoryIds: updatedCategories,
      };
    });
  }

  static async delete(id: string) {
    const [deleted] = await db
      .update(posts)
      .set({ deletedAt: new Date() })
      .where(and(eq(posts.postId, id), isNull(posts.deletedAt)))
      .returning({ postId: posts.postId });

    if (!deleted) {
      throw new NotFoundError(ErrorMessages.postNotFound);
    }

    return true;
  }

  static async createWithPermissionCheck(
    accountId: string,
    body: PostsModel['createBody']
  ) {
    // Verify the account owns the profile they're posting as
    const owned = await ProfilesService.isProfileOwnedByAccount(body.authorId, accountId);
    if (!owned) {
      throw new ForbiddenError(AuthErrorMessages.forbidden);
    }

    return this.create(body);
  }

  static async updateWithPermissionCheck(
    accountId: string,
    id: string,
    body: PostsModel['updateBody']
  ) {
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.postId, id), isNull(posts.deletedAt)),
      columns: { authorId: true },
    });

    if (!post) {
      throw new NotFoundError(ErrorMessages.postNotFound);
    }

    const profileIds = await ProfilesService.getProfileIdsByAccount(accountId);
    const isOwner = profileIds.includes(post.authorId);

    if (!isOwner) {
      throw new ForbiddenError(AuthErrorMessages.forbidden);
    }

    return this.update(id, body);
  }

  static async deleteWithPermissionCheck(
    accountId: string,
    id: string
  ) {
    const post = await db.query.posts.findFirst({
      where: and(eq(posts.postId, id), isNull(posts.deletedAt)),
      columns: { authorId: true },
    });

    if (!post) {
      throw new NotFoundError(ErrorMessages.postNotFound);
    }

    const profileIds = await ProfilesService.getProfileIdsByAccount(accountId);
    const isOwner = profileIds.includes(post.authorId);

    if (!isOwner) {
      throw new ForbiddenError(AuthErrorMessages.forbidden);
    }

    await this.delete(id);
  }
}
