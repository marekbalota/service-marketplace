import { Elysia, t } from "elysia";
import { db } from "../db";
import {
  posts,
  userProfiles,
  postCategories,
  categories,
} from "../db/schema";
import { eq, isNull, ilike, and } from "drizzle-orm";

export const postsRoutes = new Elysia({ prefix: "/posts" })
  .get(
    "/",
    async ({ query }) => {
      const { search, type, categoryId, authorId } = query;

      const rows = await db
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
          categoryId: categories.categoryId,
          categoryName: categories.name,
        })
        .from(posts)
        .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
        .leftJoin(postCategories, eq(posts.postId, postCategories.postId))
        .leftJoin(categories, eq(postCategories.categoryId, categories.categoryId))
        .where(
          and(
            isNull(posts.deletedAt),
            search ? ilike(posts.postTitle, `%${search}%`) : undefined,
            type && (type === "OFFER" || type === "REQUEST")
              ? eq(posts.postType, type)
              : undefined,
            authorId ? eq(posts.authorId, authorId) : undefined,
          ),
        );

      const postMap = new Map<
        string,
        {
          postId: string;
          postTitle: string;
          description: string;
          postType: string;
          price: string | null;
          rateType: string | null;
          createdAt: Date;
          authorId: string;
          authorName: string;
          categories: { categoryId: string; name: string }[];
        }
      >();

      for (const row of rows) {
        if (!postMap.has(row.postId)) {
          postMap.set(row.postId, {
            postId: row.postId,
            postTitle: row.postTitle,
            description: row.description,
            postType: row.postType,
            price: row.price,
            rateType: row.rateType,
            createdAt: row.createdAt,
            authorId: row.authorId,
            authorName: row.authorName,
            categories: [],
          });
        }
        if (row.categoryId && row.categoryName) {
          postMap.get(row.postId)!.categories.push({
            categoryId: row.categoryId,
            name: row.categoryName,
          });
        }
      }

      let result = Array.from(postMap.values());

      if (categoryId) {
        result = result.filter((p) =>
          p.categories.some((c) => c.categoryId === categoryId),
        );
      }

      return result;
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        type: t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
        authorId: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      const rows = await db
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
          categoryId: categories.categoryId,
          categoryName: categories.name,
        })
        .from(posts)
        .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
        .leftJoin(postCategories, eq(posts.postId, postCategories.postId))
        .leftJoin(categories, eq(postCategories.categoryId, categories.categoryId))
        .where(and(eq(posts.postId, params.id), isNull(posts.deletedAt)));

      if (rows.length === 0) {
        set.status = 404;
        return { message: "Post not found" };
      }

      const first = rows[0]!;
      const cats: { categoryId: string; name: string }[] = [];
      for (const row of rows) {
        if (row.categoryId && row.categoryName) {
          cats.push({ categoryId: row.categoryId, name: row.categoryName });
        }
      }

      return {
        postId: first.postId,
        postTitle: first.postTitle,
        description: first.description,
        postType: first.postType,
        price: first.price,
        rateType: first.rateType,
        createdAt: first.createdAt,
        authorId: first.authorId,
        authorName: first.authorName,
        categories: cats,
      };
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
        authorId: t.String({ format: "uuid" }),
        postTitle: t.String({ minLength: 3 }),
        description: t.String({ minLength: 10 }),
        postType: t.Union([t.Literal("OFFER"), t.Literal("REQUEST")]),
        price: t.Optional(t.Union([t.String(), t.Null()])),
        rateType: t.Optional(
          t.Union([
            t.Literal("HOURLY"),
            t.Literal("DAILY"),
            t.Literal("FIXED"),
            t.Null(),
          ]),
        ),
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
        // Soft-delete existing category links
        await db
          .update(postCategories)
          .set({ deletedAt: new Date() })
          .where(eq(postCategories.postId, params.id));

        // Insert new category links
        if (categoryIds.length > 0) {
          await db.insert(postCategories).values(
            categoryIds.map((categoryId) => ({
              postId: params.id,
              categoryId,
            })),
          );
        }
      }

      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        postTitle: t.Optional(t.String({ minLength: 3 })),
        description: t.Optional(t.String({ minLength: 10 })),
        postType: t.Optional(
          t.Union([t.Literal("OFFER"), t.Literal("REQUEST")]),
        ),
        price: t.Optional(t.Union([t.String(), t.Null()])),
        rateType: t.Optional(
          t.Union([
            t.Literal("HOURLY"),
            t.Literal("DAILY"),
            t.Literal("FIXED"),
            t.Null(),
          ]),
        ),
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
