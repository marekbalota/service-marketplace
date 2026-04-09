import { db } from "../../db";
import { posts, userProfiles, postCategories, categories } from "../../db/schema";
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
  })
  .from(posts)
  .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
  .leftJoin(postCategories, eq(posts.postId, postCategories.postId))
  .leftJoin(categories, eq(postCategories.categoryId, categories.categoryId))
  .groupBy(posts.postId, userProfiles.userProfileId);

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
        .where(conditions);
      const total = countRow?.total ?? 0;

      const q = postSelect(tx)
        .where(conditions)
        .orderBy(orderBy)
        .offset(effectiveOffset);

      const items = await (size !== undefined ? q.limit(size) : q);

      return {
        items,
        total,
        totalPages: size !== undefined ? Math.ceil(total / size) : 1,
      };
    });
  }

  static async findByProfile(profileId: string) {
    return postSelect(db)
      .where(and(eq(posts.authorId, profileId), isNull(posts.deletedAt)))
      .orderBy(desc(posts.createdAt));
  }

  static async findById(id: string) {
    const [row] = await postSelect(db)
      .where(and(eq(posts.postId, id), isNull(posts.deletedAt)))
      .limit(1);

    return row ?? null;
  }

  static async create(body: PostsModel['createBody']) {
    const { categoryIds, ...postValues } = body;

    return db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(posts)
        .values(postValues)
        .returning();

      if (categoryIds && categoryIds.length > 0) {
        await tx.insert(postCategories).values(
          categoryIds.map((categoryId) => ({
            postId: inserted!.postId,
            categoryId,
          })),
        );
      }

      return inserted!;
    });
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
}
