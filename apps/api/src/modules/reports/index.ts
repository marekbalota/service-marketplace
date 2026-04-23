import { Elysia } from 'elysia'
import { ReportsModel } from './model'
import { ReportsService } from './service'

export const reportCategoriesRoutes = new Elysia({ prefix: '/report-categories' })
  .get(
    '/',
    async ({ query }) => ReportsService.findCategories(query.targetType),
    {
      query: ReportsModel.categoriesQuery,
      response: { 200: ReportsModel.categoriesResponse },
      detail: { summary: 'List report categories by target type', operationId: 'listReportCategories', tags: ['Reports'] },
    },
  )
