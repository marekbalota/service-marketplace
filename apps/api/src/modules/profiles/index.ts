import { Elysia } from 'elysia'
import { ProfilesModel } from './model'
import { ProfilesService } from './service'
import { PostsModel } from '../posts/model'
import { PostsService } from '../posts/service'
import { LocationsModel, LocationsService } from '../locations'
import { authRoutes } from '../auth'
import { forbiddenResponse, notFoundResponse, unauthorizedResponse } from '../../lib/errors'

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
      const updated = await ProfilesService.updateWithOwnershipCheck(user.id, params.id, body);
      set.status = 200;
      return updated;
    },
    {
      auth: true,
      params: ProfilesModel.updateParams,
      body: ProfilesModel.updateBody,
      response: {
        200: ProfilesModel.updateResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Update a profile', operationId: 'updateProfile', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id/posts',
    async ({ params, query }) => await PostsService.findByProfile(params.id, query),
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
  );
