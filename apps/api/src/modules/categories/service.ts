import { db } from '../../db'
import { categories } from '../../db/schema'
import { asc } from 'drizzle-orm'

export abstract class CategoriesService {
  static async findAll() {
    return db
      .select({
        categoryId: categories.categoryId,
        name: categories.name,
      })
      .from(categories)
      .orderBy(asc(categories.name))
  }
}
