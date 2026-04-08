import { Elysia, t } from "elysia";
import { db } from "../db";
import { posts, userProfiles, postCategories, categories } from "../db/schema";
import { eq, isNull, ilike, and, or, desc, asc, exists, sql, count } from "drizzle-orm";

export const postsRoutes = new Elysia({ prefix: "/posts" })
  .get(
    "/",
    async ({ query }) => {
      const { search, type, categoryId, sort, offset, size } = query;

      const effectiveOffset = offset ?? 0;

      const orderBy =
        sort === "price-low"  ? asc(posts.price)      :
        sort === "price-high" ? desc(posts.price)     :
        sort === "name"       ? asc(posts.postTitle)  :
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
        sort:   t.Optional(t.Union([t.Literal("newest"), t.Literal("price-low"), t.Literal("price-high"), t.Literal("name")])),
        offset: t.Optional(t.Numeric()),
        size:   t.Optional(t.Numeric()),
      }),
    },
  );
