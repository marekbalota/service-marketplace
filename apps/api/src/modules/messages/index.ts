import { Elysia } from 'elysia'
import { MessagesModel } from './model'
import { MessagesService } from './service'
import { AuthModel } from '../auth/model'
import { authRoutes } from '../auth'
import { errorResponse } from '../../lib/errors'

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

