import { Elysia } from "elysia";
import { db } from "../db";
import { categories } from "../db/schema";
import { isNull } from "drizzle-orm";

export const categoriesRoutes = new Elysia({ prefix: "/categories" }).get(
  "/",
  async () => {
    return db
      .select({
        categoryId: categories.categoryId,
        name: categories.name,
        description: categories.description,
      })
      .from(categories)
      .where(isNull(categories.deletedAt));
  },
);
