import { Elysia, t } from 'elysia'
import { ReviewsModel } from './model'
import { ReviewsService } from './service'
import { authRoutes } from '../auth'
import { AuthModel } from '../auth/model'
import { errorResponse } from '../../lib/errors'

export const reviewsRoutes = new Elysia({ prefix: '/reviews' })
  .use(authRoutes)
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
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
        404: errorResponse,
      },
      detail: { summary: 'Delete a review', operationId: 'deleteReview', tags: ['Reviews'] },
    },
  )
