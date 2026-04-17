import { Elysia, t } from 'elysia'
import { FavouritesModel } from './model'
import { FavouritesService } from './service'
import { AuthModel } from '../auth/model'
import { authRoutes } from '../auth'
import { errorResponse } from '../../errors'

export const favouritesRoutes = new Elysia({ prefix: '/favourites' })
  .use(authRoutes)
  .get(
    '/',
    async ({ user }) => {
      // Get the user's profile from their account ID
      const { ProfilesService } = await import('../profiles/service')
      const profiles = await ProfilesService.findByAccountId(user.id)

      if (profiles.length === 0) {
        return { items: [], total: 0 }
      }

      // Use the first profile (primary profile)
      const profileId = profiles[0]!.userProfileId
      return await FavouritesService.findAllByProfile(profileId)
    },
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
      const { ProfilesService } = await import('../profiles/service')
      const profiles = await ProfilesService.findByAccountId(user.id)

      if (profiles.length === 0) {
        set.status = 404
        return { message: 'Profile not found' }
      }

      const profileId = profiles[0]!.userProfileId
      const result = await FavouritesService.addFavourite(profileId, params.postId)

      if (!result) {
        set.status = 404
        return { message: 'Post not found' }
      }

      set.status = 201
      return result
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
      const { ProfilesService } = await import('../profiles/service')
      const profiles = await ProfilesService.findByAccountId(user.id)

      if (profiles.length === 0) {
        set.status = 404
        return { message: 'Profile not found' }
      }

      const profileId = profiles[0]!.userProfileId
      const removed = await FavouritesService.removeFavourite(profileId, params.postId)

      if (!removed) {
        set.status = 404
        return { message: 'Favourite not found' }
      }

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
    async ({ params, user }) => {
      const { ProfilesService } = await import('../profiles/service')
      const profiles = await ProfilesService.findByAccountId(user.id)

      if (profiles.length === 0) {
        return { isFavourite: false }
      }

      const profileId = profiles[0]!.userProfileId
      const isFavourite = await FavouritesService.isFavourite(profileId, params.postId)
      return { isFavourite }
    },
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
