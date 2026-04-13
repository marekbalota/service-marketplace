import { Elysia, t } from 'elysia'
import { ProfilesModel } from './model'
import { ProfilesService } from './service'
import { PostsModel } from '../posts/model'
import { PostsService } from '../posts/service'
import { authRoutes } from '../auth'
import { ErrorMessages, errorResponse, AuthErrorMessages } from '../../lib/errors'
import { authErrorResponses } from '../auth/model'

export const profilesRoutes = new Elysia({ prefix: '/profiles' })
  .use(authRoutes)
  .get(
    '/:id',
    async ({ params, set }) => {
      const profile = await ProfilesService.findById(params.id)
      if (!profile) {
        set.status = 404
        return { message: ErrorMessages.profileNotFound }
      }
      return profile
    },
    {
      params: ProfilesModel.findByIdParams,
      response: {
        200: ProfilesModel.findByIdResponse,
        404: errorResponse,
      },
      detail: { summary: 'Get profile by ID', operationId: 'getProfile', tags: ['Profiles'] },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, set, user }) => {
      const isOwner = await ProfilesService.isProfileOwnedByAccount(params.id, user.id)
      if (!isOwner) {
        set.status = 403
        return { message: AuthErrorMessages.forbidden }
      }
      const updated = await ProfilesService.update(params.id, body)
      if (!updated) {
        set.status = 404
        return { message: ErrorMessages.profileNotFound }
      }
      set.status = 204
    },
    {
      auth: true,
      params: ProfilesModel.updateParams,
      body:   ProfilesModel.updateBody,
      response: {
        204: t.Void(),
        404: errorResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'Update a profile', operationId: 'updateProfile', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id/posts',
    async ({ params }) =>
      await PostsService.findByProfile(params.id),
    {
      params: ProfilesModel.profilePostsParams,
      response: { 200: PostsModel.findByProfileResponse },
      detail: { summary: 'List posts by profile', operationId: 'listProfilePosts', tags: ['Profiles'] },
    },
  )
