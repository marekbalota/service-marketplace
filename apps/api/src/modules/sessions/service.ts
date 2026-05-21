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
        location: true,
      },
    })
  }

  static async revokeSession(sessionId: string, userId: string): Promise<void> {
    const target = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        isNull(sessions.impersonatedBy),
      ),
      columns: { token: true },
    })
    if (!target) {
      throw new NotFoundError(ErrorMessages.sessionNotFound)
    }
    const { internalAdapter } = await auth.$context
    await internalAdapter.deleteSession(target.token)
  }

  static async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const targets = await db.query.sessions.findMany({
      where: and(
        eq(sessions.userId, userId),
        not(eq(sessions.id, currentSessionId)),
        isNull(sessions.impersonatedBy),
      ),
      columns: { token: true },
    })
    const { internalAdapter } = await auth.$context
    for (const target of targets) {
      await internalAdapter.deleteSession(target.token)
    }
  }
}
