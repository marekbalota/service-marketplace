import { Elysia, t } from 'elysia'
import { ImagesModel } from './model'
import { ImagesService } from './service'
import { authRoutes } from '../auth'
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from '../../lib/errors'

export const imagesRoutes = new Elysia({ prefix: '/images' })
  .use(authRoutes)
  .post(
    '/',
    async ({ body, user, set }) => {
      const created = await ImagesService.createForProfile(body.profileId, user.id, body.file)
      set.status = 201
      return created
    },
    {
      auth: true,
      body: ImagesModel.createBody,
      response: {
        201: ImagesModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'Upload an image', operationId: 'createImage', tags: ['Images'] },
    },
  )
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await ImagesService.deleteWithOwnershipCheck(params.id, user.id)
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
