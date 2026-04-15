import { Elysia, t } from 'elysia'
import { ProfilesModel } from './model'
import { AuthModel } from '../auth/model'
import { ProfilesService } from './service'
import { PostsModel } from '../posts/model'
import { PostsService } from '../posts/service'
import { LocationsModel, LocationsService } from '../locations'
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
      detail: { summary: 'List profiles', operationId: 'listProfiles', tags: ['Profiles'] },
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
      detail: { summary: 'Get profile by ID', operationId: 'getProfile', tags: ['Profiles'] },
    },
  )
  .post(
    '/',
    async ({ body, user, set }) => {
      const created = await ProfilesService.create({ ...body, accountId: user.id })
      if (!created) {
        set.status = 500
        return { message: 'Failed to create profile' }
      }
      set.status = 201
      return created
    },
    {
      auth: true,
      body: ProfilesModel.createBody,
      response: {
        201: ProfilesModel.createResponse,
        401: AuthModel.unauthorizedResponse,
      },
      detail: { summary: 'Create a profile', operationId: 'createProfile', tags: ['Profiles'] },
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
      detail: { summary: 'Update a profile', operationId: 'updateProfile', tags: ['Profiles'] },
    },
  )
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      const isOwner = await ProfilesService.isProfileOwnedByAccount(params.id, user.id)
      if (!isOwner) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }

      const activeCount = await ProfilesService.countActiveByAccountId(user.id)
      if (activeCount <= 1) {
        set.status = 409
        return { message: ErrorMessages.cannotDeleteLastProfile }
      }

      const deleted = await ProfilesService.delete(params.id)
      if (!deleted) {
        set.status = 404
        return { message: ErrorMessages.profileNotFound }
      }

      set.status = 204
    },
    {
      auth: true,
      params: ProfilesModel.deleteParams,
      response: {
        204: t.Void(),
        401: AuthModel.unauthorizedResponse,
        403: errorResponse,
        404: errorResponse,
        409: errorResponse,
      },
      detail: { summary: 'Delete a profile', operationId: 'deleteProfile', tags: ['Profiles'] },
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
  .get(
    '/:id/locations',
    async ({ params }) => LocationsService.findByProfileId(params.id),
    {
      params: LocationsModel.profileLocationsParams,
      response: { 200: LocationsModel.profileLocationsResponse },
      detail: { summary: 'List locations by profile', operationId: 'listProfileLocations', tags: ['Profiles'] },
    },
  )
