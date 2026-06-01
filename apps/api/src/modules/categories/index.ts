import { Elysia } from 'elysia'
import { CategoriesModel } from './model'
import { CategoriesService } from './service'
import { resolveLocale } from '../../lib/resolveLocale'

export const categoriesRoutes = new Elysia({ prefix: '/categories' }).get(
  '/',
  async ({ headers }) => await CategoriesService.findAll(resolveLocale(headers['accept-language'])),
  {
    response: {
      200: CategoriesModel.findAllResponse,
    },
    detail: { summary: 'List categories', operationId: 'listCategories', tags: ['Categories'] },
  },
)
