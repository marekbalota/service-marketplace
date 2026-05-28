import { db } from '../../../db'
import { users, posts, messages } from '../../../db/schema'
import { and, count, gte, lt, sql } from 'drizzle-orm'
import type { AdminAnalyticsModel } from './model'

type Granularity = 'hour' | 'day' | 'week' | 'month' | 'year'

function truncateDate(d: Date, gran: string): Date {
  const out = new Date(d)
  if (gran === 'hour') {
    out.setUTCMinutes(0, 0, 0)
    return out
  }
  out.setUTCHours(0, 0, 0, 0)
  if (gran === 'year') { out.setUTCMonth(0, 1) }
  else if (gran === 'month') out.setUTCDate(1)
  else if (gran === 'week') out.setUTCDate(out.getUTCDate() - ((out.getUTCDay() + 6) % 7))
  return out
}

function advanceDate(d: Date, gran: string): void {
  if (gran === 'hour') d.setUTCHours(d.getUTCHours() + 1)
  else if (gran === 'year') d.setUTCFullYear(d.getUTCFullYear() + 1)
  else if (gran === 'month') d.setUTCMonth(d.getUTCMonth() + 1)
  else if (gran === 'week') d.setUTCDate(d.getUTCDate() + 7)
  else d.setUTCDate(d.getUTCDate() + 1)
}

export function fillGaps(
  rows: { bucket: string; count: number }[],
  gran: Granularity,
  startDate: Date | null,
  endDate: Date,
): { bucket: Date; count: number }[] {
  if (rows.length === 0 && startDate === null) return []
  const keyLen = gran === 'hour' ? 13 : 10
  const rawStart = startDate ?? new Date(rows[0]!.bucket.replace(' ', 'T'))
  const cursor = truncateDate(rawStart, gran)
  const map = new Map(rows.map((r) => [r.bucket.replace(' ', 'T').slice(0, keyLen), r.count]))
  const result: { bucket: Date; count: number }[] = []
  while (cursor < endDate) {
    const key = cursor.toISOString().slice(0, keyLen)
    result.push({ bucket: new Date(cursor), count: map.get(key) ?? 0 })
    advanceDate(cursor, gran)
  }
  return result
}

export abstract class AdminAnalyticsService {
  static async getAnalyticsUsers(
    from: string | undefined,
    to: string,
    granularity: Granularity,
  ): Promise<AdminAnalyticsModel['analyticsResponse']> {
    const startDate = from ? new Date(from + 'T00:00:00Z') : null
    const endDate = new Date(to + 'T00:00:00Z')
    endDate.setUTCDate(endDate.getUTCDate() + 1)
    const gran = granularity
    const [totalRow] = await db.select({ total: count() }).from(users)
    const rows = await db
      .select({
        bucket: sql<string>`date_trunc(${sql.raw("'" + gran + "'")}, ${users.createdAt})::text`,
        cnt: count(),
      })
      .from(users)
      .where(and(startDate ? gte(users.createdAt, startDate) : undefined, lt(users.createdAt, endDate)))
      .groupBy(sql`1`)
      .orderBy(sql`1`)
    return {
      items: fillGaps(rows.map((r) => ({ bucket: r.bucket, count: r.cnt })), gran, startDate, endDate),
      total: totalRow?.total ?? 0,
    }
  }

  static async getAnalyticsPosts(
    from: string | undefined,
    to: string,
    granularity: Granularity,
  ): Promise<AdminAnalyticsModel['analyticsResponse']> {
    const startDate = from ? new Date(from + 'T00:00:00Z') : null
    const endDate = new Date(to + 'T00:00:00Z')
    endDate.setUTCDate(endDate.getUTCDate() + 1)
    const gran = granularity
    const [totalRow] = await db.select({ total: count() }).from(posts)
    const rows = await db
      .select({
        bucket: sql<string>`date_trunc(${sql.raw("'" + gran + "'")}, ${posts.createdAt})::text`,
        cnt: count(),
      })
      .from(posts)
      .where(and(startDate ? gte(posts.createdAt, startDate) : undefined, lt(posts.createdAt, endDate)))
      .groupBy(sql`1`)
      .orderBy(sql`1`)
    return {
      items: fillGaps(rows.map((r) => ({ bucket: r.bucket, count: r.cnt })), gran, startDate, endDate),
      total: totalRow?.total ?? 0,
    }
  }

  static async getAnalyticsMessages(
    from: string | undefined,
    to: string,
    granularity: Granularity,
  ): Promise<AdminAnalyticsModel['analyticsResponse']> {
    const startDate = from ? new Date(from + 'T00:00:00Z') : null
    const endDate = new Date(to + 'T00:00:00Z')
    endDate.setUTCDate(endDate.getUTCDate() + 1)
    const gran = granularity
    const [totalRow] = await db.select({ total: count() }).from(messages)
    const rows = await db
      .select({
        bucket: sql<string>`date_trunc(${sql.raw("'" + gran + "'")}, ${messages.createdAt})::text`,
        cnt: count(),
      })
      .from(messages)
      .where(and(startDate ? gte(messages.createdAt, startDate) : undefined, lt(messages.createdAt, endDate)))
      .groupBy(sql`1`)
      .orderBy(sql`1`)
    return {
      items: fillGaps(rows.map((r) => ({ bucket: r.bucket, count: r.cnt })), gran, startDate, endDate),
      total: totalRow?.total ?? 0,
    }
  }
}
