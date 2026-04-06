import { Elysia, t } from "elysia";
import { db } from "../db";
import { posts, userProfiles, postCategories, categories } from "../db/schema";
import { eq, isNull, ilike, and, inArray } from "drizzle-orm";

export const postsRoutes = new Elysia({ prefix: "/posts" })
  .get(
    "/",
    async ({ query }) => {
      const { search, type, categoryId } = query;

      const rows = await db
        .select({
          postId: posts.postId,
          postTitle: posts.postTitle,
          description: posts.description,
          postType: posts.postType,
          price: posts.price,
          rateType: posts.rateType,
          createdAt: posts.createdAt,
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
          ),
        );

      // Group rows by postId to merge categories
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

      // Filter by categoryId after grouping
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
      }),
    },
  );
