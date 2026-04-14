import { Elysia, t } from 'elysia'
import { ProfilesModel } from './model'
import { ProfilesService } from './service'
import { PostsModel } from '../posts/model'
import { PostsService } from '../posts/service'
import { LocationsModel, LocationsService } from '../locations'
import { authRoutes } from '../auth'
import { errorResponse } from '../../lib/errors'
import { authErrorResponses, notFoundResponse } from '../auth/model'

export const profilesRoutes = new Elysia({ prefix: '/profiles' })
  .use(authRoutes)
  .get(
    '/:id',
    async ({ params }) => await ProfilesService.findById(params.id),
    {
      params: ProfilesModel.findByIdParams,
      response: {
        200: ProfilesModel.findByIdResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Get profile by ID', operationId: 'getProfile', tags: ['Profiles'] },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      await ProfilesService.updateWithOwnershipCheck(user.id, params.id, body);
      set.status = 204;
    },
    {
      auth: true,
      params: ProfilesModel.updateParams,
      body: ProfilesModel.updateBody,
      response: {
        204: t.Void(),
        404: errorResponse,
        ...authErrorResponses,
      },
      detail: { summary: 'Update a profile', operationId: 'updateProfile', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id/posts',
    async ({ params }) => await PostsService.findByProfile(params.id),
    {
      auth:true,
      params: ProfilesModel.profilePostsParams,
      response: { 200: PostsModel.findByProfileResponse },
      detail: { summary: 'List posts by profile', operationId: 'listProfilePosts', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id/locations',
    async ({ params }) => LocationsService.findByProfileId(params.id),
    {
      auth: true,
      params: LocationsModel.profileLocationsParams,
      response: { 200: LocationsModel.profileLocationsResponse },
      detail: { summary: 'List locations by profile', operationId: 'listProfileLocations', tags: ['Profiles'] },
    },
  );
