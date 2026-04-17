import { Elysia, t } from 'elysia'
import { ImagesModel } from './model'
import { ImagesService } from './service'
import { AuthModel } from '../auth/model'
import { authRoutes } from '../auth'
import { ErrorMessages, errorResponse } from '../../errors'

export const imagesRoutes = new Elysia({ prefix: '/images' })
  .use(authRoutes)
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      const image = await ImagesService.findById(params.id)
      if (!image) {
        set.status = 404
        return { message: ErrorMessages.imageNotFound }
      }
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
      auth:     true,
      params:   ImagesModel.deleteParams,
      response: {
        204: t.Void(),
        401: AuthModel.unauthorizedResponse,
        403: errorResponse,
        404: errorResponse,
      },
      detail: { summary: 'Delete an image', operationId: 'deleteImage', tags: ['Images'] },
    },
  )
