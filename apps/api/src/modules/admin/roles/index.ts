import { Elysia, t } from 'elysia';
import { AdminRolesService } from './service';
import { AdminRolesModel } from './model';
import { Permissions } from '../../../lib/rbac/permissions';
import { authRoutes } from '../../auth';
import { authErrorResponses, notFoundResponse } from '../../auth/model';

export const adminRolesRoutes = new Elysia({ prefix: '/admin/roles' })
  .use(authRoutes)
  .get(
    '/',
    async () => await AdminRolesService.getAllRoles(),
    {
      authWithPermissions: Permissions.AdminRolesManage,
      response: {
        200: AdminRolesModel.listResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'List all roles', tags: ['Admin'] },
    }
  )
  .get(
    '/permissions',
    async () => await AdminRolesService.getAllPermissions(),
    {
      authWithPermissions: Permissions.AdminRolesManage,
      response: {
        200: AdminRolesModel.permissionResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'List all permissions', tags: ['Admin'] },
    }
  )
  .post(
    '/',
    async ({ body, set }) => {
      const role = await AdminRolesService.create(body);
      set.status = 201;
      return role;
    },
    {
      authWithPermissions: Permissions.AdminRolesManage,
      body: AdminRolesModel.createBody,
      response: {
        201: AdminRolesModel.createResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'Create role', tags: ['Admin'] },
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
        ...authErrorResponses,
        ...notFoundResponse,
      },
      detail: { summary: 'Update role', tags: ['Admin'] },
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
        ...authErrorResponses,
        ...notFoundResponse,
      },
      detail: { summary: 'Delete role', tags: ['Admin'] },
    }
  )
  .patch(
    '/reorder',
    async ({ body, user, set }) => {
      await AdminRolesService.reorder(user.roleId, body.roleId, body.newPriority);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.AdminRolesReorder,
      body: AdminRolesModel.reorderBody,
      response: {
        204: t.Void(),
        ...authErrorResponses,
      },
      detail: { summary: 'Reorder roles', tags: ['Admin'] },
    }
  )
  .patch(
    '/:id/default',
    async ({ params, user, set }) => {
      await AdminRolesService.setDefault(user.roleId, params.id);
      set.status = 204;
    },
    {
      authWithPermissions: Permissions.AdminRolesSetDefault,
      params: AdminRolesModel.setDefaultParams,
      response: {
        204: t.Void(),
        ...authErrorResponses,
        ...notFoundResponse,
      },
      detail: { summary: 'Set default role', tags: ['Admin'] },
    }
  );
