import { Elysia, t } from "elysia";
import { db } from "../db";
import { posts, userProfiles, postCategories, categories } from "../db/schema";
import { eq, isNull, ilike, and, inArray, or, desc, asc, countDistinct } from "drizzle-orm";

export const postsRoutes = new Elysia({ prefix: "/posts" })
  .get(
    "/",
    async ({ query }) => {
      const {
        search,
        type,
        categoryId,
        sort = "newest",
        page = 1,
        pageSize = 12,
      } = query;

      const offset = (page - 1) * pageSize;

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
        type && (type === "OFFER" || type === "REQUEST")
          ? eq(posts.postType, type)
          : undefined,
      );

      let total: number;
      let pagedIdRows: { postId: string }[];

      if (categoryId) {
        const [countRow] = await db
          .select({ total: countDistinct(posts.postId) })
          .from(posts)
          .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
          .innerJoin(
            postCategories,
            and(
              eq(posts.postId, postCategories.postId),
              eq(postCategories.categoryId, categoryId),
            ),
          )
          .where(conditions);
        total = Number(countRow?.total ?? 0);

        pagedIdRows = await db
          .select({ postId: posts.postId })
          .from(posts)
          .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
          .innerJoin(
            postCategories,
            and(
              eq(posts.postId, postCategories.postId),
              eq(postCategories.categoryId, categoryId),
            ),
          )
          .where(conditions)
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset);
      } else {
        const [countRow] = await db
          .select({ total: countDistinct(posts.postId) })
          .from(posts)
          .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
          .where(conditions);
        total = Number(countRow?.total ?? 0);

        pagedIdRows = await db
          .select({ postId: posts.postId })
          .from(posts)
          .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
          .where(conditions)
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset);
      }

      const ids = pagedIdRows.map((r) => r.postId);

      if (ids.length === 0) {
        return {
          items: [],
          total,
          totalPages: Math.ceil(total / pageSize),
        };
      }

      const rows = await db
        .select({
          postId:       posts.postId,
          postTitle:    posts.postTitle,
          description:  posts.description,
          postType:     posts.postType,
          price:        posts.price,
          rateType:     posts.rateType,
          createdAt:    posts.createdAt,
          authorName:   userProfiles.name,
          categoryId:   categories.categoryId,
          categoryName: categories.name,
        })
        .from(posts)
        .innerJoin(userProfiles, eq(posts.authorId, userProfiles.userProfileId))
        .leftJoin(postCategories, eq(posts.postId, postCategories.postId))
        .leftJoin(categories, eq(postCategories.categoryId, categories.categoryId))
        .where(inArray(posts.postId, ids))
        .orderBy(orderBy);

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
            postId:      row.postId,
            postTitle:   row.postTitle,
            description: row.description,
            postType:    row.postType,
            price:       row.price,
            rateType:    row.rateType,
            createdAt:   row.createdAt,
            authorName:  row.authorName,
            categories:  [],
          });
        }
        if (row.categoryId && row.categoryName) {
          postMap.get(row.postId)!.categories.push({
            categoryId: row.categoryId,
            name: row.categoryName,
          });
        }
      }

      return {
        items: Array.from(postMap.values()),
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    {
      query: t.Object({
        search:     t.Optional(t.String()),
        type:       t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
        sort:       t.Optional(t.String()),
        page:       t.Optional(t.Numeric()),
        pageSize:   t.Optional(t.Numeric()),
      }),
    },
  );
