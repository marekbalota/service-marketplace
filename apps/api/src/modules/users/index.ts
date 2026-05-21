import { Elysia } from 'elysia'
import { UsersModel } from './model'
import { UsersService } from './service'
import { authRoutes } from '../auth'
import { notFoundResponse, unauthorizedResponse } from '../../lib/errors'

export const usersRoutes = new Elysia({ prefix: '/users' }).use(authRoutes).get(
  '/me',
  async ({ user, session }) => {
    const data = await UsersService.getCurrentUser(user.id)
    return { ...data, sessionId: session.id, impersonatedBy: session.impersonatedBy ?? null }
  },
  {
    auth: true,
    response: {
      200: UsersModel.meResponse,
      ...unauthorizedResponse,
      ...notFoundResponse,
    },
    detail: {
      summary: 'Get current user with permissions and profiles',
      operationId: 'getCurrentUser',
      tags: ['Users'],
    },
  },
)
