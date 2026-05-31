import { Elysia, t } from 'elysia'
import { AdminCategoriesService } from './service'
import { AdminCategoriesModel } from './model'
import { Permissions } from '@marketplace/shared'
import { authRoutes } from '../../auth'
import {
  forbiddenResponse,
  notFoundResponse,
  unauthorizedResponse,
  conflictResponse,
  unprocessableResponse,
} from '../../../lib/errors'
import { resolveLocale } from '../../../lib/resolveLocale'

export const adminCategoriesRoutes = new Elysia({ prefix: '/admin/categories' })
  .use(authRoutes)
  .get('/', async ({ query, headers }) => await AdminCategoriesService.findAll(query, resolveLocale(headers['accept-language'])), {
    authWithPermissions: Permissions.AdminCategoriesManage,
    query: AdminCategoriesModel.listQuery,
    response: {
      200: AdminCategoriesModel.listResponse,
      ...unauthorizedResponse,
      ...forbiddenResponse,
    },
    detail: {
      summary: 'List all categories',
      operationId: 'listAdminCategories',
      tags: ['Admin'],
    },
  })
  .post(
    '/',
    async ({ body, set }) => {
      const category = await AdminCategoriesService.create(body)
      set.status = 201
      return category
    },
    {
      authWithPermissions: Permissions.AdminCategoriesManage,
      body: AdminCategoriesModel.createBody,
      response: {
        201: AdminCategoriesModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...conflictResponse,
        ...unprocessableResponse,
      },
      detail: {
        summary: 'Create category',
        operationId: 'createAdminCategory',
        tags: ['Admin'],
      },
    },
  )
  .patch(
    '/:id',
    async ({ params, body }) => await AdminCategoriesService.update(params.id, body),
    {
      authWithPermissions: Permissions.AdminCategoriesManage,
      params: AdminCategoriesModel.updateParams,
      body: AdminCategoriesModel.updateBody,
      response: {
        200: AdminCategoriesModel.updateResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
        ...conflictResponse,
        ...unprocessableResponse,
      },
      detail: {
        summary: 'Update category',
        operationId: 'updateAdminCategory',
        tags: ['Admin'],
      },
    },
  )
  .delete(
    '/:id',
    async ({ params, set }) => {
      await AdminCategoriesService.delete(params.id)
      set.status = 204
    },
    {
      authWithPermissions: Permissions.AdminCategoriesManage,
      params: AdminCategoriesModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: {
        summary: 'Delete category',
        operationId: 'deleteAdminCategory',
        tags: ['Admin'],
      },
    },
  )
