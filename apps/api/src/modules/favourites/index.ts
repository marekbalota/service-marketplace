import { Elysia, t } from 'elysia'
import { FavouritesModel } from './model'
import { FavouritesService } from './service'
import { resolveLocale } from '../../lib/resolveLocale'
import { authRoutes } from '../auth'
import {
  notFoundResponse,
  unauthorizedResponse,
  conflictResponse,
  forbiddenResponse,
} from '../../lib/errors'

export const favouritesRoutes = new Elysia({ prefix: '/favourites' })
  .use(authRoutes)
  .get(
    '/',
    async ({ user, query, headers }) => FavouritesService.findAllForProfile(user.id, query.profileId, resolveLocale(headers['accept-language'])),
    {
      auth: true,
      query: FavouritesModel.profileIdQuery,
      response: {
        200: FavouritesModel.findAllResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'List user favourites',
        operationId: 'listFavourites',
        tags: ['Favourites'],
      },
    },
  )
  .post(
    '/:postId',
    async ({ params, user, body, set }) => {
      const result = await FavouritesService.addFavouriteForProfile(
        user.id,
        body.profileId,
        params.postId,
      )
      set.status = 201
      return result
    },
    {
      auth: true,
      params: FavouritesModel.postIdParams,
      body: FavouritesModel.profileIdQuery,
      response: {
        201: FavouritesModel.addResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
        ...conflictResponse,
      },
      detail: {
        summary: 'Add post to favourites',
        operationId: 'addFavourite',
        tags: ['Favourites'],
      },
    },
  )
  .delete(
    '/:postId',
    async ({ params, user, body, set }) => {
      await FavouritesService.removeFavouriteForProfile(user.id, body.profileId, params.postId)
      set.status = 204
    },
    {
      auth: true,
      params: FavouritesModel.postIdParams,
      body: FavouritesModel.profileIdQuery,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: {
        summary: 'Remove post from favourites',
        operationId: 'removeFavourite',
        tags: ['Favourites'],
      },
    },
  )
