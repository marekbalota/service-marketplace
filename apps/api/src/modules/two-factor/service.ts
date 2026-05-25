import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { userTwoFactorMethods } from '../../db/schema'
import type { TwoFactorMethod } from '@marketplace/shared'

export abstract class TwoFactorService {
  static async getEnabledMethods(userId: string): Promise<TwoFactorMethod[]> {
    const rows = await db
      .select({ method: userTwoFactorMethods.method })
      .from(userTwoFactorMethods)
      .where(eq(userTwoFactorMethods.userId, userId))
    return rows.map((r) => r.method)
  }
}
