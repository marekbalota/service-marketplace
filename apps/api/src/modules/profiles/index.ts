import { Elysia, t } from 'elysia'
import { ProfilesModel } from './model'
import { AuthModel } from '../auth/model'
import { ProfilesService } from './service'
import { PostsModel } from '../posts/model'
import { PostsService } from '../posts/service'
import { authRoutes } from '../auth'
import { ErrorMessages, errorResponse } from '../../errors'

export const profilesRoutes = new Elysia({ prefix: '/profiles' })
  .use(authRoutes)
  .get(
    '/me',
    async ({ user }) => {
      return ProfilesService.findByAccountId(user.id)
    },
    {
      auth: true,
      response: {
        200: ProfilesModel.meResponse,
        401: AuthModel.unauthorizedResponse,
      },
    },
  )
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
    },
  )
  .patch(
    '/:id',
    async ({ params, body, set, user }) => {
      const isOwner = await ProfilesService.isProfileOwnedByAccount(params.id, user.id)
      if (!isOwner) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
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
        401: AuthModel.unauthorizedResponse,
        403: errorResponse,
        404: errorResponse,
      },
    },
  )
  .get(
    '/:id/posts',
    async ({ params }) =>
      await PostsService.findByProfile(params.id),
    {
      params: ProfilesModel.profilePostsParams,
      response: { 200: PostsModel.findByProfileResponse },
    },
  )
