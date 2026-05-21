import { and, eq, isNull, not } from 'drizzle-orm'
import { auth } from '../auth/service'
import { db } from '../../db'
import { sessions } from '../../db/schema'
import { NotFoundError, ErrorMessages } from '../../lib/errors'
import type { SessionsModel } from './model'

export abstract class SessionsService {
  static async listSessions(headers: Headers): Promise<SessionsModel['sessionItem'][]> {
    const all = await auth.api.listSessions({ headers })
    return all
      .filter((s) => !s.impersonatedBy)
      .map(({ id, createdAt, updatedAt, expiresAt, ipAddress, userAgent }) => ({
        id,
        createdAt,
        updatedAt,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      }))
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
