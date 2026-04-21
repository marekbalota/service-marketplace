import { Elysia, t } from 'elysia';
import { AdminUsersService } from './service';
import { AdminUsersModel } from './model';
import { Permissions } from '@marketplace/shared';
import { authRoutes } from '../../auth';
import { forbiddenResponse, notFoundResponse, unauthorizedResponse } from '../../../lib/errors';

export const adminUsersRoutes = new Elysia({ prefix: '/admin/users' })
  .use(authRoutes)
  .get(
    '/',
    async ({ query }) => await AdminUsersService.findAll(query),
    {
      authWithPermissions: Permissions.AdminUsersView,
      query: AdminUsersModel.usersQuery,
      response: {
        200: AdminUsersModel.usersResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'List users', operationId: 'listAdminUsers', tags: ['Admin'] },
    }
  )
  .get(
    '/:id',
    async ({ params }) => AdminUsersService.findById(params.id),
    {
      authWithPermissions: Permissions.AdminUsersView,
      params: AdminUsersModel.findByIdParams,
      response: {
        200: AdminUsersModel.findByIdResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Get user by ID', operationId: 'getAdminUser', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/ban',
    async ({ params, body, user, set }) => {
      await AdminUsersService.ban(user.roleId, params.id, body.reason, body.expiresAt);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.AdminUsersBan,
      params: AdminUsersModel.banParams,
      body: AdminUsersModel.banBody,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Ban user', operationId: 'banUser', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/unban',
    async ({ params, user, set }) => {
      await AdminUsersService.unban(user.roleId, params.id);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.AdminUsersBan,
      params: AdminUsersModel.unbanParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Unban user', operationId: 'unbanUser', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/role',
    async ({ params, body, user, set }) => {
      await AdminUsersService.assignRole(user.roleId, params.id, body.roleId);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.AdminUsersAssignRole,
      params: AdminUsersModel.assignRoleParams,
      body: AdminUsersModel.assignRoleBody,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Assign role to user', operationId: 'assignUserRole', tags: ['Admin'] },
    }
  );
