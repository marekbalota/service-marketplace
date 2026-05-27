import { db } from '../../../db'
import { users, posts, messages } from '../../../db/schema'
import { count, desc, isNull, eq } from 'drizzle-orm'
import type { AdminStatsModel } from './model'

export abstract class AdminStatsService {
  static async getStats(): Promise<AdminStatsModel['statsResponse']> {
    // Transaction ensures all four counts come from the same DB snapshot
    return db.transaction(async (tx) => {
      const [a] = await tx.select({ v: count() }).from(users)
      const [b] = await tx.select({ v: count() }).from(posts).where(isNull(posts.deletedAt))
      const [c] = await tx.select({ v: count() }).from(messages).where(isNull(messages.deletedAt))
      const [d] = await tx.select({ v: count() }).from(users).where(eq(users.isBanned, true))
      return {
        totalUsers: a?.v ?? 0,
        activePosts: b?.v ?? 0,
        totalMessages: c?.v ?? 0,
        activeBans: d?.v ?? 0,
      }
    })
  }

  static async getRecentUsers(limit: number): Promise<AdminStatsModel['recentUsersResponse']> {
    const items = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
    return { items }
  }
}
