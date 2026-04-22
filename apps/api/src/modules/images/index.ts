import { Elysia, t } from 'elysia'
import { ImagesModel } from './model'
import { ImagesService } from './service'
import { authRoutes } from '../auth'
import { ForbiddenError, NotFoundError, ErrorMessages, AuthErrorMessages, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '../../lib/errors'

export const imagesRoutes = new Elysia({ prefix: '/images' })
  .use(authRoutes)
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      const image = await ImagesService.findById(params.id)
      if (!image) throw new NotFoundError(ErrorMessages.imageNotFound)

      const isOwner = await ImagesService.isImageOwnedByAccount(params.id, user.id)
      if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

      await ImagesService.delete(params.id)
      set.status = 204
    },
    {
      auth:     true,
      params:   ImagesModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Delete an image', operationId: 'deleteImage', tags: ['Images'] },
    },
  )
