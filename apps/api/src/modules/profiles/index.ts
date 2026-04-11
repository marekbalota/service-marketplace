import { Elysia, t } from 'elysia'
import { ProfilesModel } from './model'
import { ProfilesService } from './service'
import { PostsModel } from '../posts/model'
import { PostsService } from '../posts/service'

const notFound = t.Object({ message: t.String() })

export const profilesRoutes = new Elysia({ prefix: '/profiles' })
  .get(
    '/',
    async () => await ProfilesService.findAll(),
    {
      response: { 200: ProfilesModel.findAllResponse },
      detail: { summary: 'List profiles', operationId: 'listProfiles', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id',
    async ({ params, set }) => {
      const profile = await ProfilesService.findById(params.id)
      if (!profile) {
        set.status = 404
        return { message: 'Profile not found' }
      }
      return profile
    },
    {
      params: ProfilesModel.findByIdParams,
      response: {
        200: ProfilesModel.findByIdResponse,
        404: notFound,
      },
      detail: { summary: 'Get profile by ID', operationId: 'getProfile', tags: ['Profiles'] },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      const updated = await ProfilesService.update(params.id, body)
      if (!updated) {
        set.status = 404
        return { message: 'Profile not found' }
      }
      return updated
    },
    {
      params: ProfilesModel.updateParams,
      body:   ProfilesModel.updateBody,
      response: { 404: notFound },
      detail: { summary: 'Update a profile', operationId: 'updateProfile', tags: ['Profiles'] },
    },
  )
  .get(
    '/:id/posts',
    async ({ params }) =>
      await PostsService.findByProfile(params.id),
    {
      params: ProfilesModel.profilePostsParams,
      response: { 200: PostsModel.findByProfileResponse },
      detail: { summary: 'List posts by profile', operationId: 'listProfilePosts', tags: ['Profiles'] },
    },
  )
