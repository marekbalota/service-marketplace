import { Elysia, t } from 'elysia'
import { ReviewsModel } from './model'
import { ReviewsService } from './service'
import { authRoutes } from '../auth'
import { AuthModel } from '../auth/model'
import { errorResponse, ErrorMessages } from '../../errors'
import { ProfilesService } from '../profiles/service'

export const reviewsRoutes = new Elysia({ prefix: '/posts' })
  .use(authRoutes)
  .post(
    '/:postId/reviews',
    async ({ params, body, user, set }) => {
      // Get user's profile
      const profiles = await ProfilesService.findByAccountId(user.id)

      if (!profiles.length) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }

      const profile = profiles[0]!

      try {
        const review = await ReviewsService.create(params.postId, profile.userProfileId, body)
        set.status = 201
        return review
      } catch (error) {
        if (error instanceof Error) {
          const code = (error as Error & { code?: string }).code
          if (code === 'POST_NOT_FOUND') {
            set.status = 404
            return { message: ErrorMessages.postNotFound }
          }
          if (code === 'ALREADY_REVIEWED') {
            set.status = 409
            return { message: ErrorMessages.alreadyReviewed }
          }
        }
        throw error
      }
    },
    {
      auth: true,
      params: ReviewsModel.createParams,
      body: ReviewsModel.createBody,
      response: {
        201: ReviewsModel.createResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
        404: errorResponse,
        409: errorResponse,
      },
      detail: { summary: 'Create a review for a post', operationId: 'createReview', tags: ['Reviews'] },
    },
  )

export const reviewsDeleteRoutes = new Elysia({ prefix: '/reviews' })
  .use(authRoutes)
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      // Get user's profile
      const profiles = await ProfilesService.findByAccountId(user.id)

      if (!profiles.length) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }

      const profile = profiles[0]!

      try {
        const deleted = await ReviewsService.delete(params.id, profile.userProfileId)

        if (!deleted) {
          set.status = 404
          return { message: ErrorMessages.reviewNotFound }
        }

        set.status = 204
      } catch (error) {
        if (error instanceof Error) {
          const code = (error as Error & { code?: string }).code
          if (code === 'FORBIDDEN') {
            set.status = 403
            return { message: AuthModel.messages.forbidden }
          }
        }
        throw error
      }
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
