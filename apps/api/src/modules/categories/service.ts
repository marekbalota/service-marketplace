import { db } from "../../db";
import { categories } from "../../db/schema";
import { isNull } from "drizzle-orm";

export abstract class CategoriesService {
  static async findAll() {
    return db
      .select({
        categoryId:  categories.categoryId,
        name:        categories.name,
        description: categories.description,
      })
      .from(categories)
      .where(isNull(categories.deletedAt));
  }
}
