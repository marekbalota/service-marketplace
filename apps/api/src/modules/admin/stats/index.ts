import { Elysia } from 'elysia'
import { AdminStatsService } from './service'
import { AdminStatsModel } from './model'
import { Permissions } from '@marketplace/shared'
import { authRoutes } from '../../auth'
import { forbiddenResponse, unauthorizedResponse } from '../../../lib/errors'

export const adminStatsRoutes = new Elysia({ prefix: '/admin/stats' })
  .use(authRoutes)
  .get('/', async () => AdminStatsService.getStats(), {
    authWithPermissions: Permissions.AdminStatsView,
    response: {
      200: AdminStatsModel.statsResponse,
      ...unauthorizedResponse,
      ...forbiddenResponse,
    },
    detail: { summary: 'Get dashboard stats', operationId: 'getAdminStats', tags: ['Admin'] },
  })
  .get('/recent-users', async ({ query }) => AdminStatsService.getRecentUsers(query.limit ?? 4), {
    authWithPermissions: Permissions.AdminStatsView,
    query: AdminStatsModel.recentUsersQuery,
    response: {
      200: AdminStatsModel.recentUsersResponse,
      ...unauthorizedResponse,
      ...forbiddenResponse,
    },
    detail: {
      summary: 'Get recently registered users',
      operationId: 'getAdminRecentUsers',
      tags: ['Admin'],
    },
  })
