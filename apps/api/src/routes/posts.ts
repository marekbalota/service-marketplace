import { Elysia, t } from "elysia";
import { db } from "../db";
import { posts, userProfiles, postCategories, categories } from "../db/schema";
import { eq, isNull, ilike, and, or, desc, asc, exists, sql, count } from "drizzle-orm";

export const postsRoutes = new Elysia({ prefix: "/posts" })
  .get(
    "/",
    async ({ query }) => {
      const { search, type, categoryId, authorId, sort, offset, size } = query;

      const effectiveOffset = offset ?? 0;

      const orderBy =
        sort === "price-low"  ? asc(posts.price)     :
        sort === "price-high" ? desc(posts.price)    :
        sort === "name"       ? asc(posts.postTitle) :
        desc(posts.createdAt);

      const conditions = and(
        isNull(posts.deletedAt),
        search
          ? or(
              ilike(posts.postTitle, `%${search}%`),
              ilike(posts.description, `%${search}%`),
              ilike(userProfiles.name, `%${search}%`),
            )
          : undefined,
        type ? eq(posts.postType, type) : undefined,
        authorId ? eq(posts.authorId, authorId) : undefined,
        categoryId
          ? exists(
              db.select().from(postCategories).where(
                and(
                  eq(postCategories.postId, posts.postId),
                  eq(postCategories.categoryId, categoryId),
                ),
              ),
            )
          : undefined,
      );

      const [countRow] = await db
        .select({ total: count() })
        .from(posts)
        .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
        .where(conditions);
      const total = countRow?.total ?? 0;

      const q = db
        .select({
          postId:      posts.postId,
          postTitle:   posts.postTitle,
          description: posts.description,
          postType:    posts.postType,
          price:       posts.price,
          rateType:    posts.rateType,
          createdAt:   posts.createdAt,
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
        .where(conditions)
        .groupBy(posts.postId, userProfiles.userProfileId)
        .orderBy(orderBy)
        .offset(effectiveOffset);

      const items = await (size !== undefined ? q.limit(size) : q);

      return {
        items,
        total,
        totalPages: size !== undefined ? Math.ceil(total / size) : 1,
      };
    },
    {
      query: t.Object({
        search:     t.Optional(t.String()),
        type:       t.Optional(t.Union([t.Literal("OFFER"), t.Literal("REQUEST")])),
        categoryId: t.Optional(t.String()),
        authorId:   t.Optional(t.String()),
        sort:       t.Optional(t.Union([t.Literal("newest"), t.Literal("price-low"), t.Literal("price-high"), t.Literal("name")])),
        offset:     t.Optional(t.Numeric()),
        size:       t.Optional(t.Numeric()),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      const rows = await db
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
        .where(and(eq(posts.postId, params.id), isNull(posts.deletedAt)))
        .groupBy(posts.postId, userProfiles.userProfileId)
        .limit(1);

      if (rows.length === 0) {
        set.status = 404;
        return { message: "Post not found" };
      }

      return rows[0]!;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .post(
    "/",
    async ({ body, set }) => {
      const { categoryIds, ...postValues } = body;

      const [inserted] = await db
        .insert(posts)
        .values(postValues)
        .returning();

      if (categoryIds && categoryIds.length > 0) {
        await db.insert(postCategories).values(
          categoryIds.map((categoryId) => ({
            postId: inserted!.postId,
            categoryId,
          })),
        );
      }

      set.status = 201;
      return inserted;
    },
    {
      body: t.Object({
        authorId:    t.String(),
        postTitle:   t.String({ minLength: 3 }),
        description: t.String({ minLength: 10 }),
        postType:    t.Union([t.Literal("OFFER"), t.Literal("REQUEST")]),
        price:       t.Optional(t.Union([t.String(), t.Null()])),
        rateType:    t.Optional(t.Union([t.Literal("HOURLY"), t.Literal("DAILY"), t.Literal("FIXED"), t.Null()])),
        categoryIds: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      const [existing] = await db
        .select({ postId: posts.postId })
        .from(posts)
        .where(and(eq(posts.postId, params.id), isNull(posts.deletedAt)))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { message: "Post not found" };
      }

      const { categoryIds, ...updateValues } = body;

      const [updated] = await db
        .update(posts)
        .set(updateValues)
        .where(eq(posts.postId, params.id))
        .returning();

      if (categoryIds !== undefined) {
        await db
          .update(postCategories)
          .set({ deletedAt: new Date() })
          .where(eq(postCategories.postId, params.id));

        if (categoryIds.length > 0) {
          await db.insert(postCategories).values(
            categoryIds.map((categoryId) => ({ postId: params.id, categoryId })),
          );
        }
      }

      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        postTitle:   t.Optional(t.String({ minLength: 3 })),
        description: t.Optional(t.String({ minLength: 10 })),
        postType:    t.Optional(t.Union([t.Literal("OFFER"), t.Literal("REQUEST")])),
        price:       t.Optional(t.Union([t.String(), t.Null()])),
        rateType:    t.Optional(t.Union([t.Literal("HOURLY"), t.Literal("DAILY"), t.Literal("FIXED"), t.Null()])),
        categoryIds: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      const [existing] = await db
        .select({ postId: posts.postId })
        .from(posts)
        .where(and(eq(posts.postId, params.id), isNull(posts.deletedAt)))
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { message: "Post not found" };
      }

      await db
        .update(posts)
        .set({ deletedAt: new Date() })
        .where(eq(posts.postId, params.id));

      return { message: "Post deleted" };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
