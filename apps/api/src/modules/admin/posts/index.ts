import { Elysia, t } from 'elysia'
import { AdminPostsService } from './service'
import { authRoutes } from '../../auth'
import { Permissions } from '@marketplace/shared'
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from '../../../lib/errors'

export const adminPostsRoutes = new Elysia({ prefix: '/admin/posts' })
  .use(authRoutes)
  .delete(
    '/:id',
    async ({ params, body, set }) => {
      await AdminPostsService.ban(params.id, body.banReason)
      set.status = 204
    },
    {
      authWithPermissions: Permissions.AdminPostsDeleteAny,
      params: t.Object({ id: t.String() }),
      body: t.Object({ banReason: t.String({ minLength: 1 }) }),
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Admin ban a post', operationId: 'adminBanPost', tags: ['Admin'] },
    },
  )
  .patch(
    '/:id/unban',
    async ({ params, set }) => {
      await AdminPostsService.unban(params.id)
      set.status = 204
    },
    {
      authWithPermissions: Permissions.AdminPostsDeleteAny,
      params: t.Object({ id: t.String() }),
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Admin unban a post', operationId: 'adminUnbanPost', tags: ['Admin'] },
    },
  )
