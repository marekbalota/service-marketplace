import { Elysia, t } from 'elysia'
import { FavouritesModel } from './model'
import { FavouritesService } from './service'
import { authRoutes } from '../auth'
import { notFoundResponse, unauthorizedResponse } from '../../lib/errors'

export const favouritesRoutes = new Elysia({ prefix: '/favourites' })
  .use(authRoutes)
  .get(
    '/',
    async ({ user }) => FavouritesService.findAllForAccount(user.id),
    {
      auth: true,
      response: {
        200: FavouritesModel.findAllResponse,
        ...unauthorizedResponse,
      },
      detail: { summary: 'List user favourites', operationId: 'listFavourites', tags: ['Favourites'] },
    },
  )
  .get(
    '/:postId',
    async ({ params, user }) => FavouritesService.isFavouriteForAccount(user.id, params.postId),
    {
      auth: true,
      params: FavouritesModel.postIdParams,
      response: {
        200: FavouritesModel.isFavouriteResponse,
        ...unauthorizedResponse,
      },
      detail: { summary: 'Check if post is favourited', operationId: 'checkFavourite', tags: ['Favourites'] },
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
      params: FavouritesModel.postIdParams,
      response: {
        201: FavouritesModel.addResponse,
        ...unauthorizedResponse,
        ...notFoundResponse,
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
      params: FavouritesModel.postIdParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Remove post from favourites', operationId: 'removeFavourite', tags: ['Favourites'] },
    },
  )
