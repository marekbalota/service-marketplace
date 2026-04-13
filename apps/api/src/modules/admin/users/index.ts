import { Elysia, t } from 'elysia';
import { AdminUsersService } from './service';
import { AdminUsersModel } from './model';
import { RBACService } from '../../../lib/rbac/rbac-helper';
import { Permissions } from '../../../lib/rbac/permissions';
import { authRoutes } from '../../auth';
import { AuthErrorMessages } from '../../../lib/errors';
import { db } from '../../../db';
import { users } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { authErrorResponses } from '../../auth/model';

export const adminUsersRoutes = new Elysia({ prefix: '/admin/users' })
  .use(authRoutes)
  .get(
    '/',
    async ({ query, permissions, set }) => {
      if (!permissions.includes(Permissions.AdminUsersView)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }
      return await AdminUsersService.list(query);
    },
    {
      auth: true,
      query: AdminUsersModel.listQuery,
      response: {
        200: AdminUsersModel.listResponse,
        ... authErrorResponses,
      },
      detail: { summary: 'List users', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/ban',
    async ({ params, body, permissions, user, set }) => {
      if (!permissions.includes(Permissions.AdminUsersBan)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      // Priority check - can only ban users with lower priority
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, params.id),
        with: { role: true },
      });

      if (!targetUser || !targetUser.role) {
        set.status = 404;
        return { message: 'User not found' };
      }

      const canManage = await RBACService.canManageRole(
        user.roleId,
        targetUser.role.roleId
      );

      if (!canManage) {
        set.status = 403;
        return { message: 'Cannot ban users with equal or higher role' };
      }

      const success = await AdminUsersService.ban(params.id, body.reason, body.expiresAt);
      if (!success) {
        set.status = 404;
        return { message: 'User not found' };
      }
      set.status = 204;
    },
    {
      auth: true,
      params: AdminUsersModel.banParams,
      body: AdminUsersModel.banBody,
      response: {
        204: t.Void(),
        ... authErrorResponses,
      },
      detail: { summary: 'Ban user', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/unban',
    async ({ params, permissions, user, set }) => {
      if (!permissions.includes(Permissions.AdminUsersBan)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      // Priority check
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, params.id),
        with: { role: true },
      });

      if (!targetUser || !targetUser.role) {
        set.status = 404;
        return { message: 'User not found' };
      }

      const canManage = await RBACService.canManageRole(
        user.roleId,
        targetUser.role.roleId
      );

      if (!canManage) {
        set.status = 403;
        return { message: 'Cannot unban users with equal or higher role' };
      }

      const success = await AdminUsersService.unban(params.id);
      if (!success) {
        set.status = 404;
        return { message: 'User not found' };
      }
      set.status = 204;
    },
    {
      auth: true,
      params: AdminUsersModel.unbanParams,
      response: {
        204: t.Void(),
        ... authErrorResponses,
      },
      detail: { summary: 'Unban user', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/role',
    async ({ params, body, permissions, user, set }) => {
      if (!permissions.includes(Permissions.AdminUsersAssignRole)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      // Priority check - can only assign roles with lower priority
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, params.id),
        with: { role: true },
      });

      if (!targetUser || !targetUser.role) {
        set.status = 404;
        return { message: 'User not found' };
      }

      const requesterRoleId = user.roleId;

      // Cannot modify users with equal or higher priority
      const canManageTarget = await RBACService.canManageRole(requesterRoleId, targetUser.role.roleId);
      if (!canManageTarget) {
        set.status = 403;
        return { message: 'Cannot modify users with equal or higher role' };
      }

      // Cannot assign roles with equal or higher priority
      const canManageNewRole = await RBACService.canManageRole(requesterRoleId, body.roleId);
      if (!canManageNewRole) {
        set.status = 403;
        return { message: 'Cannot assign roles with equal or higher priority' };
      }

      const success = await AdminUsersService.assignRole(params.id, body.roleId);
      if (!success) {
        set.status = 404;
        return { message: 'User not found' };
      }
      set.status = 204;
    },
    {
      auth: true,
      params: AdminUsersModel.assignRoleParams,
      body: AdminUsersModel.assignRoleBody,
      response: {
        204: t.Void(),
        ... authErrorResponses,
      },
      detail: { summary: 'Assign role to user', tags: ['Admin'] },
    }
  )
  .get(
    '/roles/assignable',
    async ({ permissions, user, set }) => {
      if (!permissions.includes(Permissions.AdminUsersAssignRole)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      const requesterPriority = await RBACService.getRolePriority(user.roleId);
      if (requesterPriority === null) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      return await AdminUsersService.listAssignableRoles(requesterPriority);
    },
    {
      auth: true,
      response: {
        200: AdminUsersModel.assignableRoleResponse,
        ... authErrorResponses,
      },
      detail: { summary: 'List assignable roles', tags: ['Admin'] },
    }
  );
