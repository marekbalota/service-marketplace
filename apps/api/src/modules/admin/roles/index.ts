import { Elysia, t } from 'elysia';
import { AdminRolesService } from './service';
import { AdminRolesModel } from './model';
import { Permissions } from '@marketplace/shared';
import { authRoutes } from '../../auth';
import { forbiddenResponse, notFoundResponse, unauthorizedResponse } from '../../../lib/errors';

export const adminRolesRoutes = new Elysia({ prefix: '/admin/roles' })
  .use(authRoutes)
  .get(
    '/',
    async () => await AdminRolesService.getAllRoles(),
    {
      authWithPermissions: [
        Permissions.AdminRolesManage,
        Permissions.AdminUsersView,
        Permissions.AdminUsersBan,
        Permissions.AdminUsersAssignRole,
      ],
      response: {
        200: AdminRolesModel.rolesResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'List all roles', operationId: 'listRoles', tags: ['Admin'] },
    }
  )
  .get(
    '/permissions',
    async () => await AdminRolesService.getAllPermissions(),
    {
      authWithPermissions: Permissions.AdminRolesManage,
      response: {
        200: AdminRolesModel.permissionResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'List all permissions', operationId: 'listPermissions', tags: ['Admin'] },
    }
  )
  .post(
    '/',
    async ({ body, set, user }) => {
      const role = await AdminRolesService.create(user.roleId, body);
      set.status = 201;
      return role;
    },
    {
      authWithPermissions: Permissions.AdminRolesManage,
      body: AdminRolesModel.createBody,
      response: {
        201: AdminRolesModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'Create role', operationId: 'createRole', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id',
    async ({ params, body, user }) => {
      return await AdminRolesService.update(user.roleId, params.id, body);
    },
    {
      authWithPermissions: Permissions.AdminRolesManage,
      params: AdminRolesModel.updateParams,
      body: AdminRolesModel.updateBody,
      response: {
        200: AdminRolesModel.updateResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Update role', operationId: 'updateRole', tags: ['Admin'] },
    }
  )
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await AdminRolesService.delete(user.roleId, params.id);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.AdminRolesManage,
      params: AdminRolesModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Delete role', operationId: 'deleteRole', tags: ['Admin'] },
    }
  )
  .patch(
    '/reorder',
    async ({ body, user, set }) => {
      await AdminRolesService.reorder(user.roleId, body.roleId, body.newPriority);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.AdminRolesManage,
      body: AdminRolesModel.reorderBody,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'Reorder roles', operationId: 'reorderRoles', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/default',
    async ({ params, user, set }) => {
      await AdminRolesService.setDefault(user.roleId, params.id);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.AdminRolesManage,
      params: AdminRolesModel.setDefaultParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Set default role', operationId: 'setDefaultRole', tags: ['Admin'] },
    }
  )
  .get(
    '/assignable',
    async ({ user }) => await AdminRolesService.listAssignableRoles(user.roleId),
    {
      authWithPermissions: Permissions.AdminUsersAssignRole,
      response: {
        200: AdminRolesModel.assignableRoleResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'List assignable roles', operationId: 'listAssignableRoles', tags: ['Admin'] },
    }
  );
