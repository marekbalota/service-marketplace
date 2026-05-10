import { Elysia } from 'elysia'
import { CategoriesModel } from './model'
import { CategoriesService } from './service'

export const categoriesRoutes = new Elysia({ prefix: '/categories' }).get(
  '/',
  async () => await CategoriesService.findAll(),
  {
    response: {
      200: CategoriesModel.findAllResponse,
    },
    detail: { summary: 'List categories', operationId: 'listCategories', tags: ['Categories'] },
  },
)
