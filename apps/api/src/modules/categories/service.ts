import { db } from '../../db'
import { categories, categoryTranslations } from '../../db/schema'
import { asc, eq, and, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

export abstract class CategoriesService {
  static async findAll(locale: string) {
    const requested = alias(categoryTranslations, 'requested')
    const fallback = alias(categoryTranslations, 'fallback')

    return db
      .select({
        categoryId: categories.categoryId,
        name: sql<string>`COALESCE(${requested.name}, ${fallback.name})`,
      })
      .from(categories)
      .innerJoin(
        fallback,
        and(eq(fallback.categoryId, categories.categoryId), eq(fallback.locale, 'en')),
      )
      .leftJoin(
        requested,
        and(eq(requested.categoryId, categories.categoryId), eq(requested.locale, locale)),
      )
      .orderBy(asc(sql<string>`COALESCE(${requested.name}, ${fallback.name})`))
  }
}
