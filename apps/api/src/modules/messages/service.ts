import { db } from '../../db'
import { messageThreads, messages, posts, userProfiles, users } from '../../db/schema'
import { eq, or, and, isNull, desc, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { MessagesModel } from './model'
import { ForbiddenError, ConflictError, AuthErrorMessages, getPgCode } from '../../lib/errors'
import { ProfilesService } from '../profiles/service'
import { PostsService } from '../posts/service'
import { sendMessageNotificationEmail } from '../../lib/email'
import { env } from '../../lib/env'

type Role = 'initiator' | 'post_owner'
type Label = 'provider' | 'client'
type PostType = 'OFFER' | 'REQUEST'

function deriveLabel(myRole: Role, postType: PostType): Label {
  return (myRole === 'post_owner') === (postType === 'OFFER') ? 'provider' : 'client'
}

export abstract class MessagesService {
  /** Returns the participant's role and whether the post has been deleted, or null if not a participant */
  static async getRole(
    threadId: string,
    profileId: string,
  ): Promise<{ role: Role; postDeleted: boolean } | null> {
    const [row] = await db
      .select({
        initiatorId: messageThreads.initiatorId,
        authorId: posts.authorId,
        postDeletedAt: posts.deletedAt,
      })
      .from(messageThreads)
      .innerJoin(posts, eq(messageThreads.postId, posts.postId))
      .where(and(eq(messageThreads.threadId, threadId), isNull(messageThreads.deletedAt)))
      .limit(1)

    if (!row) return null
    const role: Role | null =
      row.initiatorId === profileId ? 'initiator' : row.authorId === profileId ? 'post_owner' : null
    if (!role) return null
    return { role, postDeleted: row.postDeletedAt !== null }
  }

  /**
   * List threads for a profile. Verifies the caller owns the profile.
   * @throws ForbiddenError if accountId does not own profileId
   */
  static async findAllThreads(
    profileId: string,
    accountId: string,
    postId?: string,
  ): Promise<MessagesModel['findAllResponse']> {
    const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const initiatorProfile = alias(userProfiles, 'initiator_profile')
    const authorProfile = alias(userProfiles, 'author_profile')

    const rows = await db
      .select({
        threadId: messageThreads.threadId,
        postId: messageThreads.postId,
        postTitle: posts.postTitle,
        postType: posts.postType,
        postDeletedAt: posts.deletedAt,
        authorId: posts.authorId,
        initiatorId: messageThreads.initiatorId,
        initiatorName: initiatorProfile.name,
        authorName: authorProfile.name,
        lastMessage: sql<{ content: string; createdAt: string; senderId: string } | null>`
          (SELECT json_build_object(
            'content',   m.content,
            'createdAt', m.created_at,
            'senderId',  m.sender_id
          )
          FROM messages m
          WHERE m.thread_id = ${messageThreads.threadId}
            AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT 1)
        `,
        unreadCount: sql<number>`
          (SELECT COUNT(*)::int FROM messages m
           WHERE m.thread_id = ${messageThreads.threadId}
             AND m.deleted_at IS NULL
             AND m.sender_id != ${profileId}::uuid
             AND m.read_at IS NULL)
        `,
      })
      .from(messageThreads)
      .innerJoin(posts, eq(messageThreads.postId, posts.postId))
      .innerJoin(initiatorProfile, eq(messageThreads.initiatorId, initiatorProfile.userProfileId))
      .innerJoin(authorProfile, eq(posts.authorId, authorProfile.userProfileId))
      .where(
        and(
          isNull(messageThreads.deletedAt),
          or(eq(messageThreads.initiatorId, profileId), eq(posts.authorId, profileId)),
          postId ? eq(messageThreads.postId, postId) : undefined,
        ),
      )
      .orderBy(
        desc(sql`
        COALESCE(
          (SELECT m.created_at FROM messages m
           WHERE m.thread_id = ${messageThreads.threadId}
             AND m.deleted_at IS NULL
           ORDER BY m.created_at DESC LIMIT 1),
          ${messageThreads.createdAt}
        )
      `),
      )

    return rows.map((row) => {
      const myRole: Role = row.initiatorId === profileId ? 'initiator' : 'post_owner'
      const otherPartyName = myRole === 'initiator' ? row.authorName : row.initiatorName
      const label = deriveLabel(myRole, row.postType)
      const last = row.lastMessage
      return {
        threadId: row.threadId,
        postId: row.postId,
        postTitle: row.postTitle,
        postType: row.postType,
        otherPartyName,
        lastMessage: last
          ? {
              content: last.content,
              createdAt: new Date(`${last.createdAt}Z`), // Treat PostgreSQL timestamp as UTC
              sentByMe: last.senderId === profileId,
            }
          : null,
        unreadCount: row.unreadCount,
        myRole,
        label,
        postDeleted: row.postDeletedAt !== null,
      }
    })
  }

  /**
   * Get a thread with its messages. Verifies the caller owns the profile and is a participant.
   * @throws ForbiddenError if accountId does not own profileId, or if profileId is not a participant
   */
  static async findThreadById(
    threadId: string,
    profileId: string,
    accountId: string,
  ): Promise<MessagesModel['findThreadResponse']> {
    const owned = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const initiatorProfile = alias(userProfiles, 'initiator_profile')
    const authorProfile = alias(userProfiles, 'author_profile')

    const [threadRow] = await db
      .select({
        threadId: messageThreads.threadId,
        postId: messageThreads.postId,
        postTitle: posts.postTitle,
        postType: posts.postType,
        postDeletedAt: posts.deletedAt,
        authorId: posts.authorId,
        initiatorId: messageThreads.initiatorId,
        initiatorName: initiatorProfile.name,
        authorName: authorProfile.name,
      })
      .from(messageThreads)
      .innerJoin(posts, eq(messageThreads.postId, posts.postId))
      .innerJoin(initiatorProfile, eq(messageThreads.initiatorId, initiatorProfile.userProfileId))
      .innerJoin(authorProfile, eq(posts.authorId, authorProfile.userProfileId))
      .where(and(eq(messageThreads.threadId, threadId), isNull(messageThreads.deletedAt)))
      .limit(1)

    if (!threadRow) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const myRole: Role | null =
      threadRow.initiatorId === profileId
        ? 'initiator'
        : threadRow.authorId === profileId
          ? 'post_owner'
          : null

    if (!myRole) throw new ForbiddenError(AuthErrorMessages.forbidden)

    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.threadId, threadId),
          sql`${messages.senderId} != ${profileId}::uuid`,
          isNull(messages.readAt),
          isNull(messages.deletedAt),
        ),
      )

    const msgRows = await db
      .select({
        messageId: messages.messageId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        readAt: messages.readAt,
      })
      .from(messages)
      .where(and(eq(messages.threadId, threadId), isNull(messages.deletedAt)))
      .orderBy(messages.createdAt)

    const otherPartyName = myRole === 'initiator' ? threadRow.authorName : threadRow.initiatorName

    return {
      threadId: threadRow.threadId,
      postId: threadRow.postId,
      postTitle: threadRow.postTitle,
      postType: threadRow.postType,
      otherPartyName,
      myRole,
      label: deriveLabel(myRole, threadRow.postType),
      postDeleted: threadRow.postDeletedAt !== null,
      messages: msgRows.map((m) => ({
        messageId: m.messageId,
        content: m.content,
        createdAt: m.createdAt,
        sentByMe: m.senderId === profileId,
        readAt: m.readAt,
      })),
    }
  }

  /**
   * Create a new thread and send the first message.
   * @throws ForbiddenError if accountId does not own body.profileId, or if the profile owns the post
   * @throws NotFoundError if body.postId does not exist (thrown by PostsService.findById)
   * @throws ConflictError if a thread for this post already exists for this profile
   */
  static async createThread(
    body: MessagesModel['createThreadBody'],
    accountId: string,
  ): Promise<{ threadId: string }> {
    const owned = await ProfilesService.isProfileOwnedByAccount(body.profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const post = await PostsService.findById(body.postId)
    if (post.authorId === body.profileId) {
      throw new ForbiddenError('Cannot start a thread on your own post')
    }

    let result: { threadId: string }
    try {
      result = await db.transaction(async (tx) => {
        const [thread] = await tx
          .insert(messageThreads)
          .values({ postId: body.postId, initiatorId: body.profileId })
          .returning({ threadId: messageThreads.threadId })

        await tx.insert(messages).values({
          threadId: thread!.threadId,
          senderId: body.profileId,
          content: body.content,
        })

        return { threadId: thread!.threadId }
      })
    } catch (err: unknown) {
      if (getPgCode(err) === '23505')
        throw new ConflictError('A thread for this post already exists')
      throw err
    }

    // Fire-and-forget: notify post author about the new thread
    void (async () => {
      try {
        const [authorEmailRow, initiatorRow] = await Promise.all([
          db
            .select({ email: users.email, notifyMessages: users.notifyMessages })
            .from(userProfiles)
            .innerJoin(users, eq(userProfiles.accountId, users.id))
            .where(eq(userProfiles.userProfileId, post.authorId))
            .limit(1),
          db
            .select({ name: userProfiles.name })
            .from(userProfiles)
            .where(eq(userProfiles.userProfileId, body.profileId))
            .limit(1),
        ])
        if (authorEmailRow[0] && initiatorRow[0] && authorEmailRow[0].notifyMessages) {
          await sendMessageNotificationEmail({
            recipientEmail: authorEmailRow[0].email,
            senderName: initiatorRow[0].name,
            postTitle: post.postTitle,
            threadUrl: `${env.frontendUrl}/messages/${result.threadId}`,
          })
        }
      } catch (notifyErr) {
        console.error('[notification] createThread notification failed:', notifyErr)
      }
    })()

    return result
  }

  /**
   * Send a message to an existing thread.
   * @throws ForbiddenError if accountId does not own body.profileId, or if the profile is not a participant, or if the post is deleted
   */
  static async addMessage(
    threadId: string,
    body: MessagesModel['sendMessageBody'],
    accountId: string,
  ): Promise<MessagesModel['sendMessageResponse']> {
    const owned = await ProfilesService.isProfileOwnedByAccount(body.profileId, accountId)
    if (!owned) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const roleResult = await this.getRole(threadId, body.profileId)
    if (!roleResult) throw new ForbiddenError(AuthErrorMessages.forbidden)
    if (roleResult.postDeleted) {
      throw new ForbiddenError('This thread is archived because the post has been deleted')
    }

    const [inserted] = await db
      .insert(messages)
      .values({ threadId, senderId: body.profileId, content: body.content })
      .returning()

    // Fire-and-forget: notify the other participant
    void (async () => {
      try {
        const initiatorAlias = alias(userProfiles, 'initiator_profile')
        const authorAlias = alias(userProfiles, 'author_profile')
        const [threadRow] = await db
          .select({
            initiatorId: messageThreads.initiatorId,
            authorId: posts.authorId,
            postTitle: posts.postTitle,
            initiatorName: initiatorAlias.name,
            authorName: authorAlias.name,
          })
          .from(messageThreads)
          .innerJoin(posts, eq(messageThreads.postId, posts.postId))
          .innerJoin(initiatorAlias, eq(messageThreads.initiatorId, initiatorAlias.userProfileId))
          .innerJoin(authorAlias, eq(posts.authorId, authorAlias.userProfileId))
          .where(eq(messageThreads.threadId, threadId))
          .limit(1)

        if (!threadRow) return

        const recipientProfileId =
          roleResult.role === 'initiator' ? threadRow.authorId : threadRow.initiatorId
        const senderName =
          roleResult.role === 'initiator' ? threadRow.initiatorName : threadRow.authorName

        const [recipientEmailRow] = await db
          .select({ email: users.email, notifyMessages: users.notifyMessages })
          .from(userProfiles)
          .innerJoin(users, eq(userProfiles.accountId, users.id))
          .where(eq(userProfiles.userProfileId, recipientProfileId))
          .limit(1)

        if (recipientEmailRow && recipientEmailRow.notifyMessages) {
          await sendMessageNotificationEmail({
            recipientEmail: recipientEmailRow.email,
            senderName,
            postTitle: threadRow.postTitle,
            threadUrl: `${env.frontendUrl}/messages/${threadId}`,
          })
        }
      } catch (notifyErr) {
        console.error('[notification] addMessage notification failed:', notifyErr)
      }
    })()

    return {
      messageId: inserted!.messageId,
      content: inserted!.content,
      createdAt: inserted!.createdAt,
      sentByMe: true,
      readAt: null,
    }
  }
}
