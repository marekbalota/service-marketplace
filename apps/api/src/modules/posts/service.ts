import { db } from "../../db";
import { posts, userProfiles, postCategories, categories, locations } from "../../db/schema";
import { eq, isNull, ilike, and, or, desc, asc, exists, sql, count } from "drizzle-orm";
import type { PostsModel } from "./model";

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
  static async findAll(query: PostsModel['findAllQuery']) {
    const { search, type, categoryId, sort, offset, size } = query;
    const effectiveOffset = offset ?? 0;

    const orderBy =
      sort === 'price-low'  ? asc(posts.price)     :
      sort === 'price-high' ? desc(posts.price)    :
      sort === 'name'       ? asc(posts.postTitle) :
      desc(posts.createdAt);

    return db.transaction(async (tx) => {
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
        type       ? eq(posts.postType, type)      : undefined,
        categoryId
          ? exists(
              tx.select().from(postCategories).where(
                and(
                  eq(postCategories.postId, posts.postId),
                  eq(postCategories.categoryId, categoryId),
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
        .offset(effectiveOffset);

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

  static async findByProfile(profileId: string) {
    const rows = await postSelect(db)
      .where(and(eq(posts.authorId, profileId), isNull(posts.deletedAt)))
      .orderBy(desc(posts.createdAt));

    return rows.map(({ locationId, locationCity, locationCountry, ...rest }) => ({
      ...rest,
      location: locationId ? { locationId, city: locationCity, country: locationCountry } : null,
    }));
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
        reviews: sql<{ reviewId: string; rating: number; reviewDescription: string | null; reviewerName: string; createdAt: Date }[]>`
          coalesce(
            (select json_agg(json_build_object(
              'reviewId',          r.review_id,
              'rating',            r.rating,
              'reviewDescription', r.review_description,
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
      return null;
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
        .returning({ postId: posts.postId });

      if (!updated) {
        return null;
      }

      if (categoryIds !== undefined) {
        await tx
          .delete(postCategories)
          .where(eq(postCategories.postId, id));

        if (categoryIds.length > 0) {
          await tx.insert(postCategories).values(
            categoryIds.map((categoryId) => ({ postId: id, categoryId })),
          );
        }
      }

      return updated;
    });
  }

  static async delete(id: string) {
    const [deleted] = await db
      .update(posts)
      .set({ deletedAt: new Date() })
      .where(and(eq(posts.postId, id), isNull(posts.deletedAt)))
      .returning({ postId: posts.postId });

    return deleted ? true : null;
  }

  static async checkPostOwnership(postId: string, accountId: string): Promise<'not_found' | 'forbidden' | 'ok'> {
    const [row] = await db
      .select({ accountId: userProfiles.accountId })
      .from(posts)
      .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
      .where(and(eq(posts.postId, postId), isNull(posts.deletedAt)))
      .limit(1)

    if (!row) return 'not_found'
    if (row.accountId !== accountId) return 'forbidden'
    return 'ok'
  }
}
