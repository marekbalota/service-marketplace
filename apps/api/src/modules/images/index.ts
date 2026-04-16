import { Elysia, t } from 'elysia'
import { ImagesModel } from './model'
import { ImagesService } from './service'
import { ProfilesService } from '../profiles/service'
import { AuthModel } from '../auth/model'
import { authRoutes } from '../auth'
import { ErrorMessages, errorResponse } from '../../errors'

export const imagesRoutes = new Elysia()
  .use(authRoutes)
  .get(
    '/profiles/:id/images',
    async ({ params }) => ImagesService.findByProfileId(params.id),
    {
      params: ImagesModel.profileImagesParams,
      response: { 200: ImagesModel.profileImagesResponse },
      detail: { summary: 'List images by profile', operationId: 'listProfileImages', tags: ['Images'] },
    },
  )
  .post(
    '/profiles/:id/images',
    async ({ params, body, user, set }) => {
      const isOwner = await ProfilesService.isProfileOwnedByAccount(params.id, user.id)
      if (!isOwner) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }
      const created = await ImagesService.create(params.id, body)
      if (!created) {
        set.status = 500
        return { message: 'Failed to create image' }
      }
      set.status = 201
      return created
    },
    {
      auth: true,
      params: ImagesModel.profileImagesParams,
      body: ImagesModel.createBody,
      response: {
        201: ImagesModel.createResponse,
        401: AuthModel.unauthorizedResponse,
        403: errorResponse,
      },
      detail: { summary: 'Add image to profile', operationId: 'createProfileImage', tags: ['Images'] },
    },
  )
  .delete(
    '/images/:id',
    async ({ params, user, set }) => {
      const isOwner = await ImagesService.isImageOwnedByAccount(params.id, user.id)
      if (!isOwner) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }
      const deleted = await ImagesService.delete(params.id)
      if (!deleted) {
        set.status = 404
        return { message: ErrorMessages.imageNotFound }
      }
      set.status = 204
    },
    {
      auth: true,
      params: ImagesModel.deleteParams,
      response: {
        204: t.Void(),
        401: AuthModel.unauthorizedResponse,
        403: errorResponse,
        404: errorResponse,
      },
      detail: { summary: 'Delete an image', operationId: 'deleteImage', tags: ['Images'] },
    },
  )
