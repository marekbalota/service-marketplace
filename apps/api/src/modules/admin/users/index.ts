import { Elysia, t } from 'elysia';
import { AdminUsersService } from './service';
import { AdminUsersModel } from './model';
import { Permissions } from '@marketplace/shared';
import { authRoutes } from '../../auth';
import { authErrorResponses, notFoundResponse } from '../../auth/model';

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
        ...authErrorResponses,
      },
      detail: { summary: 'List users', operationId: 'listAdminUsers', tags: ['Admin'] },
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
        ...authErrorResponses,
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
        ...authErrorResponses,
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
        ...authErrorResponses,
        ...notFoundResponse,
      },
      detail: { summary: 'Assign role to user', operationId: 'assignUserRole', tags: ['Admin'] },
    }
  )
  .get(
    '/roles/assignable',
    async ({ user }) => await AdminUsersService.listAssignableRoles(user.roleId),
    {
      authWithPermissions: Permissions.AdminUsersAssignRole,
      response: {
        200: AdminUsersModel.assignableRoleResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'List assignable roles', operationId: 'listAssignableRoles', tags: ['Admin'] },
    }
  );
