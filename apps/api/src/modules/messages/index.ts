import { Elysia } from 'elysia'
import { MessagesModel } from './model'
import { MessagesService } from './service'
import { authRoutes } from '../auth'
import { conflictResponse, forbiddenResponse, notFoundResponse, unauthorizedResponse } from '../../lib/errors'
import { ReportsModel } from '../reports/model'
import { ReportsService } from '../reports/service'

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
        ...unauthorizedResponse,
        ...forbiddenResponse,
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
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
        ...conflictResponse,
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
        ...unauthorizedResponse,
        ...forbiddenResponse,
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
        ...unauthorizedResponse,
        ...forbiddenResponse,
      },
      detail: { summary: 'Send a message', operationId: 'sendMessage', tags: ['Messages'] },
    },
  )

  // Report a message
  .post(
    '/:threadId/messages/:messageId/reports',
    async ({ params, body, user, set }) => {
      const report = await ReportsService.createForMessageForAccount(user.id, params.threadId, params.messageId, body)
      set.status = 201
      return report
    },
    {
      auth: true,
      params: ReportsModel.messageReportParams,
      body: ReportsModel.createBody,
      response: {
        201: ReportsModel.createResponse,
        ...unauthorizedResponse,
        ...forbiddenResponse,
        ...notFoundResponse,
        ...conflictResponse,
      },
      detail: { summary: 'Report a message', operationId: 'createMessageReport', tags: ['Reports'] },
    },
  )


