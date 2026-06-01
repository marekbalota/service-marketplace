import { Elysia, t } from 'elysia'
import { PostsModel } from './model'
import { PostsService } from './service'
import { resolveLocale } from '../../lib/resolveLocale'
import { authRoutes } from '../auth'
import { auth } from '../auth/service'
import { Permissions } from '@marketplace/shared'
import {
  forbiddenResponse,
  notFoundResponse,
  unauthorizedResponse,
  conflictResponse,
  AuthErrorMessages,
} from '../../lib/errors'
import { ReportsModel } from '../reports/model'
import { ReportsService } from '../reports/service'

export const postsRoutes = new Elysia({ prefix: '/posts' })
  .use(authRoutes)
  .get(
    '/',
    async ({ query, headers, status }) => {
      if (query.profileId) {
        const session = await auth.api.getSession({ headers })
        if (!session) return status(401, { message: AuthErrorMessages.unauthorized })
        return PostsService.findAll(
          query,
          session.user.id,
          resolveLocale(headers['accept-language']),
        )
      }
      return PostsService.findAll(query, undefined, resolveLocale(headers['accept-language']))
    },
    {
      query: PostsModel.findAllQuery,
      response: {
        200: PostsModel.findAllResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'List posts', operationId: 'listPosts', tags: ['Posts'] },
    },
  )
  .get(
    '/:id',
    async ({ params, headers }) =>
      await PostsService.findById(params.id, resolveLocale(headers['accept-language'])),
    {
      params: PostsModel.findByIdParams,
      response: {
        200: PostsModel.findByIdResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Get post by ID', operationId: 'getPost', tags: ['Posts'] },
    },
  )
  .post(
    '/',
    async ({ body, user, set }) => {
      const post = await PostsService.createWithPermissionCheck(user.id, body)
      set.status = 201
      return post
    },
    {
      authWithPermissions: Permissions.PostsCreate,
      body: PostsModel.createBody,
      response: {
        201: PostsModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'Create a post', operationId: 'createPost', tags: ['Posts'] },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      const updated = await PostsService.updateWithPermissionCheck(user.id, params.id, body)
      set.status = 200
      return updated
    },
    {
      authWithPermissions: Permissions.PostsEditOwn,
      params: PostsModel.updateParams,
      body: PostsModel.updateBody,
      response: {
        200: PostsModel.updateResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Update a post', operationId: 'updatePost', tags: ['Posts'] },
    },
  )
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      await PostsService.deleteWithPermissionCheck(user.id, params.id)
      set.status = 204
    },
    {
      authWithPermissions: Permissions.PostsDeleteOwn,
      params: PostsModel.deleteParams,
      response: {
        204: t.Void(),
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
      },
      detail: { summary: 'Delete a post', operationId: 'deletePost', tags: ['Posts'] },
    },
  )
  .post(
    '/:id/reports',
    async ({ params, body, user, set }) => {
      const report = await ReportsService.createForPostForAccount(user.id, params.id, body)
      set.status = 201
      return report
    },
    {
      auth: true,
      params: ReportsModel.createParams,
      body: ReportsModel.createBody,
      response: {
        201: ReportsModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
        ...conflictResponse,
      },
      detail: { summary: 'Report a post', operationId: 'createPostReport', tags: ['Reports'] },
    },
  )
