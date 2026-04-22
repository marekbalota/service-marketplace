import { Elysia } from 'elysia'
import { ProfilesModel } from './model'
import { ProfilesService } from './service'
import { PostsModel } from '../posts/model'
import { PostsService } from '../posts/service'
import { LocationsModel, LocationsService } from '../locations'
import { ImagesModel } from '../images/model'
import { ImagesService } from '../images/service'
import { authRoutes } from '../auth'
import { ForbiddenError, ConflictError, ErrorMessages, AuthErrorMessages, unauthorizedResponse, forbiddenResponse, notFoundResponse, conflictResponse } from '../../lib/errors'
import { uploadImage, deleteUploadedImage } from '../../storage'

export const profilesRoutes = new Elysia({ prefix: '/profiles' })
  .use(authRoutes)
  .get(
    '/me',
    async ({ user }) => ProfilesService.findByAccountId(user.id),
    {
      auth: true,
      response: {
        200: ProfilesModel.meResponse,
        ...unauthorizedResponse,
      },
      detail: { summary: 'List my profiles', operationId: 'listMyProfiles', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id',
    async ({ params }) => ProfilesService.findById(params.id),
    {
      params: ProfilesModel.findByIdParams,
      response: {
        200: ProfilesModel.findByIdResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Get profile by ID', operationId: 'getProfile', tags: ['Profiles'] },
    },
  )
  .post(
    '/',
    async ({ body, user, set }) => {
      const created = await ProfilesService.create({ ...body, accountId: user.id })
      set.status = 201
      return created
    },
    {
      auth: true,
      body: ProfilesModel.createBody,
      response: {
        201: ProfilesModel.createResponse,
        ...unauthorizedResponse,
      },
      detail: { summary: 'Create a profile', operationId: 'createProfile', tags: ['Profiles'] },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, user }) => ProfilesService.updateWithOwnershipCheck(user.id, params.id, body),
    {
      auth: true,
      params: ProfilesModel.updateParams,
      body:   ProfilesModel.updateBody,
      response: {
        200: ProfilesModel.updateResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Update a profile', operationId: 'updateProfile', tags: ['Profiles'] },
    },
  )
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      const isOwner = await ProfilesService.isProfileOwnedByAccount(params.id, user.id)
      if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

      const activeCount = await ProfilesService.countActiveByAccountId(user.id)
      if (activeCount <= 1) throw new ConflictError(ErrorMessages.cannotDeleteLastProfile)

      await ProfilesService.delete(params.id)
      set.status = 204
    },
    {
      auth: true,
      params: ProfilesModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...conflictResponse,
      },
      detail: { summary: 'Delete a profile', operationId: 'deleteProfile', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id/posts',
    async ({ params, query }) => PostsService.findByProfile(params.id, query),
    {
      auth: true,
      params:   ProfilesModel.profilePostsParams,
      query:    PostsModel.findByProfileQuery,
      response: {
        200: PostsModel.findByProfileResponse,
        ...unauthorizedResponse,
      },
      detail: { summary: 'List posts by profile', operationId: 'listProfilePosts', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id/locations',
    async ({ params }) => LocationsService.findByProfileId(params.id),
    {
      auth: true,
      params: LocationsModel.profileLocationsParams,
      response: {
        200: LocationsModel.profileLocationsResponse,
        ...unauthorizedResponse,
      },
      detail: { summary: 'List locations by profile', operationId: 'listProfileLocations', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id/images',
    async ({ params }) => ImagesService.findByProfileId(params.id),
    {
      params:   ImagesModel.profileImagesParams,
      response: { 200: ImagesModel.profileImagesResponse },
      detail:   { summary: 'List images by profile', operationId: 'listProfileImages', tags: ['Images'] },
    },
  )
  .post(
    '/:id/images',
    async ({ params, body, user, set }) => {
      const isOwner = await ProfilesService.isProfileOwnedByAccount(params.id, user.id)
      if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

      const link = await uploadImage(body.file, params.id)
      const created = await ImagesService.create(params.id, { link, name: body.file.name })
      if (!created) {
        await deleteUploadedImage(link).catch(() => {})
        throw new Error('Failed to save image')
      }
      set.status = 201
      return created
    },
    {
      auth:   true,
      params: ImagesModel.profileImagesParams,
      body:   ImagesModel.createBody,
      response: {
        201: ImagesModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'Upload image to profile', operationId: 'createProfileImage', tags: ['Images'] },
    },
  )
