import { and, eq, gt, isNull, not } from 'drizzle-orm'
import { auth } from '../auth/service'
import { db } from '../../db'
import { sessions } from '../../db/schema'
import { NotFoundError, ErrorMessages } from '../../lib/errors'
import type { SessionsModel } from './model'

export abstract class SessionsService {
  static async listSessions(userId: string): Promise<SessionsModel['sessionItem'][]> {
    return db.query.sessions.findMany({
      where: and(
        eq(sessions.userId, userId),
        isNull(sessions.impersonatedBy),
        gt(sessions.expiresAt, new Date()),
      ),
      columns: {
        id: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    })
  }

  static async revokeSession(sessionId: string, userId: string, headers: Headers): Promise<void> {
    const target = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        isNull(sessions.impersonatedBy),
      ),
    })
    if (!target) {
      throw new NotFoundError(ErrorMessages.sessionNotFound)
    }
    await auth.api.revokeSession({ body: { token: target.token }, headers })
  }

  static async revokeOtherSessions(userId: string, currentSessionId: string, headers: Headers): Promise<void> {
    const targets = await db.query.sessions.findMany({
      where: and(
        eq(sessions.userId, userId),
        not(eq(sessions.id, currentSessionId)),
        isNull(sessions.impersonatedBy),
      ),
    })
    for (const target of targets) {
      await auth.api.revokeSession({ body: { token: target.token }, headers })
    }
  }
}
