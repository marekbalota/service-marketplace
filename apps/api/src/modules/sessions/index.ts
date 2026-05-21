import { Elysia, t } from 'elysia'
import { authRoutes } from '../auth'
import { forbiddenResponse, notFoundResponse, unauthorizedResponse } from '../../lib/errors'
import { SessionsModel } from './model'
import { SessionsService } from './service'

export const sessionsRoutes = new Elysia({ prefix: '/sessions' })
  .use(authRoutes)
  .get('/', async ({ user }) => SessionsService.listSessions(user.id), {
    auth: true,
    response: {
      200: t.Array(SessionsModel.sessionItem),
      ...unauthorizedResponse,
    },
    detail: {
      summary: 'List active sessions for current user',
      operationId: 'listSessions',
      tags: ['Sessions'],
    },
  })
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await SessionsService.revokeSession(params.id, user.id)
      set.status = 204
    },
    {
      auth: true,
      params: SessionsModel.idParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: {
        summary: 'Revoke a specific session by ID',
        operationId: 'revokeSession',
        tags: ['Sessions'],
      },
    },
  )
  .delete(
    '/',
    async ({ user, session: currentSession, set }) => {
      await SessionsService.revokeOtherSessions(user.id, currentSession.id)
      set.status = 204
    },
    {
      auth: true,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'Revoke all sessions except current',
        operationId: 'revokeOtherSessions',
        tags: ['Sessions'],
      },
    },
  )
