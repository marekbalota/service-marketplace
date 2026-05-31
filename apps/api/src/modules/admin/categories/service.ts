import { db } from '../../../db'
import { categories, categoryTranslations, postCategories, posts } from '../../../db/schema'
import { eq, asc, count, sql, and } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { SUPPORTED_LOCALES } from '@marketplace/shared'
import type { AdminCategoriesModel } from './model'
import { NotFoundError, ConflictError, UnprocessableEntityError, ErrorMessages, getPgCode, getPgDetail } from '../../../lib/errors'

function parseConflictLocale(e: unknown): string | undefined {
  const detail = getPgDetail(e)
  if (!detail) return undefined
  const match = /Key \(locale, name\)=\(([^,)]+),/.exec(detail)
  return match?.[1]?.trim()
}

export abstract class AdminCategoriesService {
  static async findAll(query: AdminCategoriesModel['listQuery'], locale: string) {
    const { search, offset = 0, size = 10 } = query

    const localeTranslation = alias(categoryTranslations, 'locale_translation')
    const enTranslation = alias(categoryTranslations, 'en_translation')

    const whereClause = search
      ? sql`EXISTS (
          SELECT 1 FROM ${categoryTranslations}
          WHERE ${categoryTranslations.categoryId} = ${categories.categoryId}
          AND ${categoryTranslations.name} ILIKE ${`%${search}%`}
        )`
      : undefined

    return db.transaction(async (tx) => {
      const [countRow] = await tx
        .select({ total: count() })
        .from(categories)
        .where(whereClause)

      const total = countRow?.total ?? 0
      const totalPages = Math.ceil(total / size)

      const rows = await tx
        .select({
          categoryId: categories.categoryId,
          translations: sql<{ locale: string; name: string }[]>`(
            SELECT COALESCE(json_agg(json_build_object('locale', ct.locale, 'name', ct.name)), '[]'::json)
            FROM category_translations ct
            WHERE ct.category_id = ${categories.categoryId}
          )`,
          activePosts:
            sql<number>`count(${posts.postId}) filter (where ${posts.deletedAt} is null)`.mapWith(Number),
          archivedPosts:
            sql<number>`count(${posts.postId}) filter (where ${posts.deletedAt} is not null)`.mapWith(Number),
        })
        .from(categories)
        .leftJoin(
          localeTranslation,
          and(
            eq(localeTranslation.categoryId, categories.categoryId),
            eq(localeTranslation.locale, locale),
          ),
        )
        .innerJoin(
          enTranslation,
          and(
            eq(enTranslation.categoryId, categories.categoryId),
            eq(enTranslation.locale, 'en'),
          ),
        )
        .leftJoin(postCategories, eq(postCategories.categoryId, categories.categoryId))
        .leftJoin(posts, eq(posts.postId, postCategories.postId))
        .where(whereClause)
        .groupBy(categories.categoryId, localeTranslation.name, enTranslation.name)
        .orderBy(asc(sql`COALESCE(${localeTranslation.name}, ${enTranslation.name})`))
        .limit(size)
        .offset(offset)

      const items = rows.map((row) => ({
        categoryId: row.categoryId,
        translations: row.translations ?? [],
        activePosts: row.activePosts,
        archivedPosts: row.archivedPosts,
      }))

      return { items, total, totalPages }
    })
  }

  static async create(body: AdminCategoriesModel['createBody']) {
    const { translations } = body

    const enTr = translations.find((t) => t.locale === 'en')
    if (!enTr || !enTr.name.trim()) {
      throw new UnprocessableEntityError(ErrorMessages.missingEnglishTranslation)
    }

    const unsupported = translations.filter(
      (t) => !(SUPPORTED_LOCALES as readonly string[]).includes(t.locale),
    )
    if (unsupported.length > 0) {
      throw new UnprocessableEntityError(ErrorMessages.unsupportedLocale)
    }

    const valid = translations.filter((t) => t.name.trim().length > 0)

    return db.transaction(async (tx) => {
      try {
        const [category] = await tx.insert(categories).values({}).returning({
          categoryId: categories.categoryId,
        })

        const insertedTranslations = await tx
          .insert(categoryTranslations)
          .values(
            valid.map((t) => ({
              categoryId: category!.categoryId,
              locale: t.locale,
              name: t.name.trim(),
            })),
          )
          .returning({ locale: categoryTranslations.locale, name: categoryTranslations.name })

        return { categoryId: category!.categoryId, translations: insertedTranslations }
      } catch (e: unknown) {
        if (getPgCode(e) === '23505') {
          throw new ConflictError(ErrorMessages.categoryNameConflict, parseConflictLocale(e))
        }
        throw e
      }
    })
  }

  static async update(id: string, body: AdminCategoriesModel['updateBody']) {
    const { translations } = body

    const existing = await db.query.categories.findFirst({
      where: eq(categories.categoryId, id),
    })
    if (!existing) {
      throw new NotFoundError(ErrorMessages.categoryNotFound)
    }

    const unsupported = translations.filter(
      (t) => !(SUPPORTED_LOCALES as readonly string[]).includes(t.locale),
    )
    if (unsupported.length > 0) {
      throw new UnprocessableEntityError(ErrorMessages.unsupportedLocale)
    }

    const valid = translations.filter((t) => t.name.trim().length > 0)
    if (valid.length === 0) {
      throw new UnprocessableEntityError(ErrorMessages.missingEnglishTranslation)
    }

    return db.transaction(async (tx) => {
      try {
        await tx
          .insert(categoryTranslations)
          .values(valid.map((t) => ({ categoryId: id, locale: t.locale, name: t.name.trim() })))
          .onConflictDoUpdate({
            target: [categoryTranslations.categoryId, categoryTranslations.locale],
            set: { name: sql`excluded.name` },
          })

        const updatedTranslations = await tx
          .select({ locale: categoryTranslations.locale, name: categoryTranslations.name })
          .from(categoryTranslations)
          .where(eq(categoryTranslations.categoryId, id))

        return { categoryId: id, translations: updatedTranslations }
      } catch (e: unknown) {
        if (getPgCode(e) === '23505') {
          throw new ConflictError(ErrorMessages.categoryNameConflict, parseConflictLocale(e))
        }
        throw e
      }
    })
  }

  static async delete(id: string) {
    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.categoryId, id))
      .returning({ categoryId: categories.categoryId })

    if (!deleted) {
      throw new NotFoundError(ErrorMessages.categoryNotFound)
    }
  }
}
