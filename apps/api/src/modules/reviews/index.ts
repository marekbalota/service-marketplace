import { Elysia, t } from 'elysia'
import { ReviewsModel } from './model'
import { ReviewsService } from './service'
import { authRoutes } from '../auth'
import { conflictResponse, forbiddenResponse, notFoundResponse, unauthorizedResponse } from '../../lib/errors'
import { ReportsModel } from '../reports/model'
import { ReportsService } from '../reports/service'

export const reviewsRoutes = new Elysia({ prefix: '/reviews' })
  .use(authRoutes)
  .post(
    '/',
    async ({ body, user, set }) => {
      const review = await ReviewsService.createWithOwnerShipCheck(user.id, body.postId, body)
      set.status = 201
      return review
    },
    {
      auth: true,
      body: ReviewsModel.createBody,
      response: {
        201: ReviewsModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
        ...conflictResponse,
      },
      detail: { summary: 'Create a review for a post', operationId: 'createReview', tags: ['Reviews'] },
    },
  )
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await ReviewsService.deleteForAccount(user.id, params.id)
      set.status = 204
    },
    {
      auth: true,
      params: ReviewsModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse
      },
      detail: { summary: 'Delete a review', operationId: 'deleteReview', tags: ['Reviews'] },
    },
  )
  .post(
    '/:id/reports',
    async ({ params, body, user, set }) => {
      const report = await ReportsService.createForReviewForAccount(user.id, params.id, body)
      set.status = 201
      return report
    },
    {
      auth: true,
      params: ReportsModel.createParams,
      body: ReportsModel.createBody,
      response: {
        201: ReportsModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
        ...conflictResponse,
      },
      detail: { summary: 'Report a review', operationId: 'createReviewReport', tags: ['Reports'] },
    },
  )

