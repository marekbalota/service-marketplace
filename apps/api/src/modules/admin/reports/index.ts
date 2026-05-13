import { Elysia, t } from 'elysia'
import { AdminReportsService } from './service'
import { AdminReportsModel } from './model'
import { Permissions } from '@marketplace/shared'
import { authRoutes } from '../../auth'
import { forbiddenResponse, notFoundResponse, unauthorizedResponse } from '../../../lib/errors'

export const adminReportsRoutes = new Elysia({ prefix: '/admin/reports' })
  .use(authRoutes)
  .get('/', async ({ query }) => AdminReportsService.findAll(query), {
    authWithPermissions: [
      Permissions.AdminUsersView,
      Permissions.AdminUsersBan,
      Permissions.AdminUsersAssignRole,
      Permissions.AdminUsersImpersonate,
      Permissions.AdminPostsDeleteAny,
    ],
    query: AdminReportsModel.reportsQuery,
    response: {
      200: AdminReportsModel.reportsResponse,
      ...unauthorizedResponse,
      ...forbiddenResponse,
    },
    detail: { summary: 'List reports', operationId: 'listAdminReports', tags: ['Admin'] },
  })
  .patch(
    '/:id/resolve',
    async ({ params, set }) => {
      await AdminReportsService.resolve(params.id)
      set.status = 204
    },
    {
      authWithPermissions: Permissions.AdminUsersBan,
      params: AdminReportsModel.reportParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Resolve report', operationId: 'resolveReport', tags: ['Admin'] },
    },
  )
  .patch(
    '/:id/dismiss',
    async ({ params, set }) => {
      await AdminReportsService.dismiss(params.id)
      set.status = 204
    },
    {
      authWithPermissions: Permissions.AdminUsersBan,
      params: AdminReportsModel.reportParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Dismiss report', operationId: 'dismissReport', tags: ['Admin'] },
    },
  )
