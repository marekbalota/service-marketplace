import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { twoFactors } from '../../db/schema'

export abstract class TwoFactorService {
  static async isTotpEnabled(userId: string): Promise<boolean> {
    const tf = await db.query.twoFactors.findFirst({
      where: eq(twoFactors.userId, userId),
    })
    return tf?.verified === true
  }
}
