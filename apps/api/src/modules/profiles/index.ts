import { Elysia, t } from 'elysia'
import { ProfilesModel } from './model'
import { ProfilesService } from './service'
import { PostsModel } from '../posts/model'
import { PostsService } from '../posts/service'
import { LocationsModel, LocationsService } from '../locations'
import { ImagesModel } from '../images/model'
import { ImagesService } from '../images/service'
import { authRoutes } from '../auth'
import {
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
} from '../../lib/errors'
import { ReportsService } from '../reports/service'

export const profilesRoutes = new Elysia({ prefix: '/profiles' })
  .use(authRoutes)
  .get('/:id', async ({ params }) => ProfilesService.findById(params.id), {
    params: ProfilesModel.findByIdParams,
    response: {
      200: ProfilesModel.findByIdResponse,
      ...notFoundResponse,
    },
    detail: { summary: 'Get profile by ID', operationId: 'getProfile', tags: ['Profiles'] },
  })
  .post(
    '/',
    async ({ body, user, set }) => {
      const created = await ProfilesService.create(user.id, body)
      set.status = 201
      return created
    },
    {
      auth: true,
      body: ProfilesModel.createBody,
      response: {
        201: ProfilesModel.createResponse,
        ...unauthorizedResponse,
      },
      detail: { summary: 'Create a profile', operationId: 'createProfile', tags: ['Profiles'] },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, user }) =>
      ProfilesService.updateWithOwnershipCheck(user.id, params.id, body),
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
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await ProfilesService.deleteWithOwnershipCheck(params.id, user.id)
      set.status = 204
    },
    {
      auth: true,
      params: ProfilesModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...conflictResponse,
      },
      detail: { summary: 'Delete a profile', operationId: 'deleteProfile', tags: ['Profiles'] },
    },
  )
  .get('/:id/posts', async ({ params, query }) => PostsService.findByProfile(params.id, query), {
    auth: true,
    params: ProfilesModel.profilePostsParams,
    query: PostsModel.findByProfileQuery,
    response: {
      200: PostsModel.findByProfileResponse,
      ...unauthorizedResponse,
    },
    detail: {
      summary: 'List posts by profile',
      operationId: 'listProfilePosts',
      tags: ['Profiles'],
    },
  })
  .get('/:id/posts/count', async ({ params }) => PostsService.countByProfile(params.id), {
    auth: true,
    params: ProfilesModel.profilePostsParams,
    response: {
      200: PostsModel.profilePostsCountResponse,
      ...unauthorizedResponse,
    },
    detail: {
      summary: 'Count active and archived posts by profile',
      operationId: 'countProfilePosts',
      tags: ['Profiles'],
    },
  })
  .get(
    '/:id/locations',
    async ({ params, user }) => LocationsService.findByProfileId(params.id, user.id),
    {
      auth: true,
      params: LocationsModel.profileLocationsParams,
      response: {
        200: LocationsModel.profileLocationsResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'List locations by profile',
        operationId: 'listProfileLocations',
        tags: ['Profiles'],
      },
    },
  )
  .post(
    '/:id/locations',
    async ({ params, body, user, set }) => {
      const hasField = Object.values(body).some((v) => typeof v === 'string' && v.trim() !== '')
      if (!hasField) {
        set.status = 422
        return { message: 'At least one location field must be provided' }
      }
      const location = await LocationsService.addToProfile(params.id, user.id, body)
      set.status = 201
      return location
    },
    {
      auth: true,
      params: LocationsModel.profileLocationsParams,
      body: LocationsModel.addBody,
      response: {
        201: LocationsModel.addResponse,
        422: t.Object({ message: t.String() }),
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'Add a location to profile',
        operationId: 'addProfileLocation',
        tags: ['Profiles'],
      },
    },
  )
  .delete(
    '/:id/locations/:locationId',
    async ({ params, user, set }) => {
      await LocationsService.removeFromProfile(params.id, user.id, params.locationId)
      set.status = 204
    },
    {
      auth: true,
      params: LocationsModel.removeParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: {
        summary: 'Remove a location from profile',
        operationId: 'removeProfileLocation',
        tags: ['Profiles'],
      },
    },
  )
  .get('/:id/images', async ({ params }) => ImagesService.findByProfileId(params.id), {
    params: ImagesModel.profileImagesParams,
    response: { 200: ImagesModel.profileImagesResponse },
    detail: {
      summary: 'List images by profile',
      operationId: 'listProfileImages',
      tags: ['Images'],
    },
  })
  .get(
    '/:id/reported/posts/:postId',
    async ({ params, user, set }) => {
      const reported = await ReportsService.hasReportedPost(user.id, params.id, params.postId)
      set.status = reported ? 204 : 404
    },
    {
      auth: true,
      params: ProfilesModel.reportedPostParams,
      response: {
        204: t.Void(),
        404: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'Check if profile has reported a post',
        operationId: 'checkProfileReportedPost',
        tags: ['Profiles'],
      },
    },
  )
  .get(
    '/:id/reported/reviews/:reviewId',
    async ({ params, user, set }) => {
      const reported = await ReportsService.hasReportedReview(user.id, params.id, params.reviewId)
      set.status = reported ? 204 : 404
    },
    {
      auth: true,
      params: ProfilesModel.reportedReviewParams,
      response: {
        204: t.Void(),
        404: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'Check if profile has reported a review',
        operationId: 'checkProfileReportedReview',
        tags: ['Profiles'],
      },
    },
  )
  .get(
    '/:id/reported/messages/:messageId',
    async ({ params, user, set }) => {
      const reported = await ReportsService.hasReportedMessage(user.id, params.id, params.messageId)
      set.status = reported ? 204 : 404
    },
    {
      auth: true,
      params: ProfilesModel.reportedMessageParams,
      response: {
        204: t.Void(),
        404: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: {
        summary: 'Check if profile has reported a message',
        operationId: 'checkProfileReportedMessage',
        tags: ['Profiles'],
      },
    },
  )
