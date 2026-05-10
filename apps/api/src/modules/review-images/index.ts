import { Elysia, t } from 'elysia'
import { ReviewImagesModel } from './model'
import { ReviewImagesService } from './service'
import { authRoutes } from '../auth'
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from '../../lib/errors'

export const reviewImagesRoutes = new Elysia({ prefix: '/review-images' })
  .use(authRoutes)
  .post(
    '/',
    async ({ body, user, set }) => {
      const created = await ReviewImagesService.createForReview(body.reviewId, user.id, body.file)
      set.status = 201
      return created
    },
    {
      auth: true,
      body: ReviewImagesModel.createBody,
      response: {
        201: ReviewImagesModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Upload an image for a review', operationId: 'createReviewImage', tags: ['Reviews'] },
    },
  )
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await ReviewImagesService.deleteWithOwnershipCheck(params.id, user.id)
      set.status = 204
    },
    {
      auth: true,
      params: ReviewImagesModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Delete a review image', operationId: 'deleteReviewImage', tags: ['Reviews'] },
    },
  )
