import { Elysia, t } from 'elysia';
import { AdminRolesService } from './service';
import { AdminRolesModel } from './model';
import { RBACService } from '../../../lib/rbac/rbac-helper';
import { Permissions } from '../../../lib/rbac/permissions';
import { authRoutes } from '../../auth';
import { AuthErrorMessages } from '../../../lib/errors';
import { db } from '../../../db';
import { roles } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { authErrorResponses } from '../../auth/model';

export const adminRolesRoutes = new Elysia({ prefix: '/admin/roles' })
  .use(authRoutes)
  .get(
    '/',
    async () => await AdminRolesService.list(),
    {
      auth: true,
      response: { 200: AdminRolesModel.listResponse },
      detail: { summary: 'List all roles', tags: ['Admin'] },
    }
  )
  .get(
    '/permissions',
    async () => await AdminRolesService.listPermissions(),
    {
      auth: true,
      response: { 200: AdminRolesModel.permissionResponse },
      detail: { summary: 'List all permissions', tags: ['Admin'] },
    }
  )
  .post(
    '/',
    async ({ body, permissions, set }) => {
      if (!permissions.includes(Permissions.AdminRolesManage)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }
      const role = await AdminRolesService.create(body);
      set.status = 201;
      return role;
    },
    {
      auth: true,
      body: AdminRolesModel.createBody,
      response: {
        201: AdminRolesModel.createResponse,
        ... authErrorResponses,
      },
      detail: { summary: 'Create role', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id',
    async ({ params, body, permissions, user, set }) => {
      if (!permissions.includes(Permissions.AdminRolesManage)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      // Priority check - can only edit roles with lower priority
      const canManage = await RBACService.canManageRole(
        user.roleId,
        params.id
      );

      if (!canManage) {
        set.status = 403;
        return { message: 'Cannot modify roles with equal or higher priority' };
      }

      const role = await AdminRolesService.update(params.id, body);
      if (!role) {
        set.status = 404;
        return { message: 'Role not found' };
      }
      return role;
    },
    {
      auth: true,
      params: AdminRolesModel.updateParams,
      body: AdminRolesModel.updateBody,
      response: {
        200: AdminRolesModel.updateResponse,
        ... authErrorResponses,
      },
      detail: { summary: 'Update role', tags: ['Admin'] },
    }
  )
  .delete(
    '/:id',
    async ({ params, permissions, user, set }) => {
      if (!permissions.includes(Permissions.AdminRolesManage)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      // Priority check
      const canManage = await RBACService.canManageRole(
        user.roleId,
        params.id
      );

      if (!canManage) {
        set.status = 403;
        return { message: 'Cannot delete roles with equal or higher priority' };
      }

      // Check if role is default
      const role = await db.query.roles.findFirst({
        where: eq(roles.roleId, params.id),
      });
      if (role?.isDefault) {
        set.status = 400;
        return { message: 'Cannot delete the default role' };
      }

      const deleted = await AdminRolesService.delete(params.id);
      if (!deleted) {
        set.status = 404;
        return { message: 'Role not found' };
      }
      set.status = 204;
    },
    {
      auth: true,
      params: AdminRolesModel.deleteParams,
      response: {
        204: t.Void(),
        ... authErrorResponses,
      },
      detail: { summary: 'Delete role', tags: ['Admin'] },
    }
  )
  .post(
    '/reorder',
    async ({ body, permissions, user, set }) => {
      if (!permissions.includes(Permissions.AdminRolesReorder)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      const requesterPriority = await RBACService.getRolePriority(user.roleId);
      if (requesterPriority === null) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      // newPriority must be less than requester's priority
      const success = await AdminRolesService.reorder(
        body.roleId,
        body.newPriority,
        requesterPriority - 1
      );

      if (!success) {
        set.status = 403;
        return { message: 'Invalid reorder operation' };
      }
      set.status = 204;
    },
    {
      auth: true,
      body: AdminRolesModel.reorderBody,
      response: {
        204: t.Void(),
        ... authErrorResponses,
      },
      detail: { summary: 'Reorder roles', tags: ['Admin'] },
    }
  )
  .post(
    '/:id/default',
    async ({ params, permissions, user, set }) => {
      if (!permissions.includes(Permissions.AdminRolesSetDefault)) {
        set.status = 403;
        return { message: AuthErrorMessages.forbidden };
      }

      // Priority check - can only set roles below own priority as default
      const canManage = await RBACService.canManageRole(
        user.roleId,
        params.id
      );

      if (!canManage) {
        set.status = 403;
        return { message: 'Cannot set roles with equal or higher priority as default' };
      }

      const success = await AdminRolesService.setDefault(params.id);
      if (!success) {
        set.status = 404;
        return { message: 'Role not found' };
      }
      set.status = 204;
    },
    {
      auth: true,
      params: AdminRolesModel.setDefaultParams,
      response: {
        204: t.Void(),
        ... authErrorResponses,
      },
      detail: { summary: 'Set default role', tags: ['Admin'] },
    }
  );
