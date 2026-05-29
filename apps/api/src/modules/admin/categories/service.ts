import { db } from '../../../db'
import { categories, postCategories, posts } from '../../../db/schema'
import { eq, asc, count, ilike, sql } from 'drizzle-orm'
import type { AdminCategoriesModel } from './model'
import { NotFoundError, ConflictError, ErrorMessages, getPgCode } from '../../../lib/errors'

export abstract class AdminCategoriesService {
  static async findAll(query: AdminCategoriesModel['listQuery']) {
    const { search, offset = 0, size = 10 } = query
    const whereClause = search ? ilike(categories.name, `%${search}%`) : undefined

    return db.transaction(async (tx) => {
      const [countRow] = await tx.select({ total: count() }).from(categories).where(whereClause)

      const total = countRow?.total ?? 0
      const totalPages = Math.ceil(total / size)

      const items = await tx
        .select({
          categoryId: categories.categoryId,
          name: categories.name,
          activePosts:
            sql`count(${posts.postId}) filter (where ${posts.deletedAt} is null)`.mapWith(Number),
          archivedPosts:
            sql`count(${posts.postId}) filter (where ${posts.deletedAt} is not null)`.mapWith(
              Number,
            ),
        })
        .from(categories)
        .leftJoin(postCategories, eq(postCategories.categoryId, categories.categoryId))
        .leftJoin(posts, eq(posts.postId, postCategories.postId))
        .where(whereClause)
        .groupBy(categories.categoryId)
        .orderBy(asc(categories.name))
        .limit(size)
        .offset(offset)

      return { items, total, totalPages }
    })
  }

  static async create(body: AdminCategoriesModel['createBody']) {
    try {
      const [category] = await db.insert(categories).values({ name: body.name }).returning({
        categoryId: categories.categoryId,
        name: categories.name,
      })
      return category!
    } catch (e: unknown) {
      if (getPgCode(e) === '23505') {
        throw new ConflictError(ErrorMessages.categoryNameConflict)
      }
      throw e
    }
  }

  static async update(id: string, body: AdminCategoriesModel['updateBody']) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.categoryId, id),
    })
    if (!existing) {
      throw new NotFoundError(ErrorMessages.categoryNotFound)
    }

    try {
      const [category] = await db
        .update(categories)
        .set({ ...(body.name !== undefined && { name: body.name }) })
        .where(eq(categories.categoryId, id))
        .returning({
          categoryId: categories.categoryId,
          name: categories.name,
        })
      return category!
    } catch (e: unknown) {
      if (getPgCode(e) === '23505') {
        throw new ConflictError(ErrorMessages.categoryNameConflict)
      }
      throw e
    }
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
