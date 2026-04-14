import { Elysia, t } from 'elysia';
import { AdminUsersService } from './service';
import { AdminUsersModel } from './model';
import { Permissions } from '../../../lib/rbac/permissions';
import { authRoutes } from '../../auth';
import { authErrorResponses, notFoundResponse } from '../../auth/model';

export const adminUsersRoutes = new Elysia({ prefix: '/admin/users' })
  .use(authRoutes)
  .get(
    '/',
    async ({ query }) => await AdminUsersService.list(query),
    {
      authWithPermissions: Permissions.AdminUsersView,
      query: AdminUsersModel.listQuery,
      response: {
        200: AdminUsersModel.listResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'List users', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/ban',
    async ({ params, body, user }) => {
      await AdminUsersService.ban(user.roleId, params.id, body.reason, body.expiresAt);
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
      detail: { summary: 'Ban user', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/unban',
    async ({ params, user }) => {
      await AdminUsersService.unban(user.roleId, params.id);
    },
    {
      authWithPermissions: Permissions.AdminUsersBan,
      params: AdminUsersModel.unbanParams,
      response: {
        204: t.Void(),
        ...authErrorResponses,
      },
      detail: { summary: 'Unban user', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/role',
    async ({ params, body, user }) => {
      await AdminUsersService.assignRole(user.roleId, params.id, body.roleId);
    },
    {
      authWithPermissions: Permissions.AdminUsersAssignRole,
      params: AdminUsersModel.assignRoleParams,
      body: AdminUsersModel.assignRoleBody,
      response: {
        204: t.Void(),
        ...authErrorResponses,
      },
      detail: { summary: 'Assign role to user', tags: ['Admin'] },
    }
  )
  .get(
    '/roles/assignable',
    async ({ user }) => {
      const requesterPriority = await RBACService.getRolePriority(user.roleId);
      if (requesterPriority === null) {
        throw new Error('Forbidden');
      }
      return await AdminUsersService.listAssignableRoles(requesterPriority);
    },
    {
      authWithPermissions: Permissions.AdminUsersAssignRole,
      response: {
        200: AdminUsersModel.assignableRoleResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'List assignable roles', tags: ['Admin'] },
    }
  );
