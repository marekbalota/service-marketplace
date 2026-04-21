import { Elysia } from 'elysia'
import { MessagesModel } from './model'
import { MessagesService } from './service'
import { AuthModel } from '../auth/model'
import { authRoutes } from '../auth'
import { errorResponse } from '../../lib/errors'
import { ReportsModel } from '../reports/model'
import { ReportsService } from '../reports/service'
import { ProfilesService } from '../profiles/service'
import { ForbiddenError, AuthErrorMessages } from '../../lib/errors'

export const messagesRoutes = new Elysia({ prefix: '/threads' })
  .use(authRoutes)

  // List threads for the active profile (optionally filtered by postId)
  .get(
    '/',
    async ({ query, user }) => await MessagesService.findAllThreads(query.profileId, user.id, query.postId),
    {
      auth: true,
      query: MessagesModel.findAllQuery,
      response: {
        200: MessagesModel.findAllResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
      },
      detail: { summary: 'List threads', operationId: 'listThreads', tags: ['Messages'] },
    },
  )

  // Create a new thread (and send the first message)
  .post(
    '/',
    async ({ body, user, set }) => {
      const result = await MessagesService.createThread(body, user.id)
      set.status = 201
      return result
    },
    {
      auth: true,
      body: MessagesModel.createThreadBody,
      response: {
        201: MessagesModel.createThreadResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
        404: errorResponse,
        409: errorResponse,
      },
      detail: { summary: 'Create a thread', operationId: 'createThread', tags: ['Messages'] },
    },
  )

  // Get thread detail + messages (also marks messages as read)
  .get(
    '/:threadId',
    async ({ params, query, user }) =>
      await MessagesService.findThreadById(params.threadId, query.profileId, user.id),
    {
      auth: true,
      params: MessagesModel.threadParams,
      query: MessagesModel.threadProfileQuery,
      response: {
        200: MessagesModel.findThreadResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
      },
      detail: { summary: 'Get thread by ID', operationId: 'getThread', tags: ['Messages'] },
    },
  )

  // Send a message to an existing thread
  .post(
    '/:threadId/messages',
    async ({ params, body, user, set }) => {
      const msg = await MessagesService.addMessage(params.threadId, body, user.id)
      set.status = 201
      return msg
    },
    {
      auth: true,
      params: MessagesModel.threadParams,
      body: MessagesModel.sendMessageBody,
      response: {
        201: MessagesModel.sendMessageResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
      },
      detail: { summary: 'Send a message', operationId: 'sendMessage', tags: ['Messages'] },
    },
  )

  // Report a message
  .post(
    '/:threadId/messages/:messageId/reports',
    async ({ params, body, user, set }) => {
      const profiles = await ProfilesService.findByAccountId(user.id)
      if (!profiles.length) throw new ForbiddenError(AuthErrorMessages.forbidden)
      const roleResult = await MessagesService.getRole(params.threadId, profiles[0]!.userProfileId)
      if (!roleResult) throw new ForbiddenError(AuthErrorMessages.forbidden)
      const report = await ReportsService.createForMessageForAccount(user.id, params.messageId, body)
      set.status = 201
      return report
    },
    {
      auth: true,
      params: ReportsModel.messageReportParams,
      body: ReportsModel.messageCreateBody,
      response: {
        201: ReportsModel.createResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
        404: errorResponse,
        409: errorResponse,
      },
      detail: { summary: 'Report a message', operationId: 'createMessageReport', tags: ['Reports'] },
    },
  )

  // Check if current user has reported a message
  .get(
    '/:threadId/messages/:messageId/reports/check',
    async ({ params, user }) => {
      const profiles = await ProfilesService.findByAccountId(user.id)
      if (!profiles.length) throw new ForbiddenError(AuthErrorMessages.forbidden)
      const roleResult = await MessagesService.getRole(params.threadId, profiles[0]!.userProfileId)
      if (!roleResult) throw new ForbiddenError(AuthErrorMessages.forbidden)
      const hasReported = await ReportsService.hasReportedMessageForAccount(user.id, params.messageId)
      return { hasReported }
    },
    {
      auth: true,
      params: ReportsModel.messageReportParams,
      response: {
        200: ReportsModel.checkResponse,
        401: AuthModel.unauthorizedResponse,
        403: AuthModel.forbiddenResponse,
      },
      detail: { summary: 'Check if current user has reported a message', operationId: 'checkMessageReport', tags: ['Reports'] },
    },
  )

