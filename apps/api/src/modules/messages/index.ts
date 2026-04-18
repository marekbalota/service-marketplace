import { Elysia, t } from 'elysia'
import { MessagesModel } from './model'
import { MessagesService } from './service'
import { ProfilesService } from '../profiles/service'
import { PostsService } from '../posts/service'
import { AuthModel } from '../auth/model'
import { authRoutes } from '../auth'
import { ErrorMessages, errorResponse } from '../../lib/errors'

export const messagesRoutes = new Elysia({ prefix: '/threads' })
  .use(authRoutes)

  // List threads for the active profile (optionally filtered by postId)
  .get(
    '/',
    async ({ query, user, set }) => {
      const owned = await ProfilesService.isProfileOwnedByAccount(query.profileId, user.id)
      if (!owned) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }
      return MessagesService.findAllThreads(query.profileId, query.postId)
    },
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
      const owned = await ProfilesService.isProfileOwnedByAccount(body.profileId, user.id)
      if (!owned) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }

      // Fetch post to check ownership
      const post = await PostsService.findById(body.postId)
      if (!post) {
        set.status = 404
        return { message: ErrorMessages.postNotFound }
      }
      if (post.authorId === body.profileId) {
        set.status = 403
        return { message: 'Cannot start a thread on your own post' }
      }

      try {
        const result = await MessagesService.createThread(body.postId, body.profileId, body.content)
        set.status = 201
        return result
      } catch (err: unknown) {
        // PostgreSQL unique violation code 23505. Drizzle wraps the postgres error in
        // DrizzleQueryError, so the code lives on err.cause; check both locations.
        const pgCode =
          (err && typeof err === 'object' && 'code' in err
            ? (err as { code: string }).code
            : undefined) ??
          (err && typeof err === 'object' && 'cause' in err &&
           err.cause && typeof err.cause === 'object' && 'code' in err.cause
            ? (err.cause as { code: string }).code
            : undefined)

        if (pgCode === '23505') {
          set.status = 409
          return { message: 'A thread for this post already exists' }
        }
        throw err
      }
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
    async ({ params, query, user, set }) => {
      const owned = await ProfilesService.isProfileOwnedByAccount(query.profileId, user.id)
      if (!owned) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }

      const thread = await MessagesService.findThreadById(params.threadId, query.profileId)
      if (!thread) {
        // Could be not found or not a participant — return 403 to avoid leaking existence
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }
      return thread
    },
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
      const owned = await ProfilesService.isProfileOwnedByAccount(body.profileId, user.id)
      if (!owned) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }

      const roleResult = await MessagesService.getRole(params.threadId, body.profileId)
      if (!roleResult) {
        set.status = 403
        return { message: AuthModel.messages.forbidden }
      }
      if (roleResult.postDeleted) {
        set.status = 403
        return { message: 'This thread is archived because the post has been deleted' }
      }

      set.status = 201
      return MessagesService.addMessage(params.threadId, body.profileId, body.content)
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
