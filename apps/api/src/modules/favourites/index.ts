import { Elysia, t } from 'elysia'
import { FavouritesModel } from './model'
import { FavouritesService } from './service'
import { AuthModel } from '../auth/model'
import { authRoutes } from '../auth'
import { errorResponse } from '../../lib/errors'

export const favouritesRoutes = new Elysia({ prefix: '/favourites' })
  .use(authRoutes)
  .get(
    '/',
    async ({ user }) => FavouritesService.findAllForAccount(user.id),
    {
      auth: true,
      response: {
        200: FavouritesModel.findAllResponse,
        401: AuthModel.unauthorizedResponse,
      },
      detail: { summary: 'List user favourites', operationId: 'listFavourites', tags: ['Favourites'] },
    },
  )
  .post(
    '/:postId',
    async ({ params, user, set }) => {
      set.status = 201
      return FavouritesService.addFavouriteForAccount(user.id, params.postId)
    },
    {
      auth: true,
      params: FavouritesModel.addParams,
      response: {
        201: FavouritesModel.addResponse,
        401: AuthModel.unauthorizedResponse,
        404: errorResponse,
      },
      detail: { summary: 'Add post to favourites', operationId: 'addFavourite', tags: ['Favourites'] },
    },
  )
  .delete(
    '/:postId',
    async ({ params, user, set }) => {
      await FavouritesService.removeFavouriteForAccount(user.id, params.postId)
      set.status = 204
    },
    {
      auth: true,
      params: FavouritesModel.removeParams,
      response: {
        204: t.Void(),
        401: AuthModel.unauthorizedResponse,
        404: errorResponse,
      },
      detail: { summary: 'Remove post from favourites', operationId: 'removeFavourite', tags: ['Favourites'] },
    },
  )
  .get(
    '/check/:postId',
    async ({ params, user }) => FavouritesService.isFavouriteForAccount(user.id, params.postId),
    {
      auth: true,
      params: FavouritesModel.addParams,
      response: {
        200: FavouritesModel.isFavouriteResponse,
        401: AuthModel.unauthorizedResponse,
      },
      detail: { summary: 'Check if post is favourited', operationId: 'checkFavourite', tags: ['Favourites'] },
    },
  )
