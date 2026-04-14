import { db } from '../../db'
import { messageThreads, messages, posts, userProfiles } from '../../db/schema'
import { eq, or, and, isNull, desc, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { MessagesModel } from './model'

type Role = 'initiator' | 'post_owner'
type Label = 'offer' | 'request'
type PostType = 'OFFER' | 'REQUEST'

function deriveLabel(myRole: Role, postType: PostType): Label {
  return (myRole === 'post_owner') === (postType === 'OFFER') ? 'offer' : 'request'
}

export abstract class MessagesService {
  /** Returns 'initiator' | 'post_owner' | null if not a participant */
  static async getRole(threadId: string, profileId: string): Promise<Role | null> {
    const [row] = await db
      .select({
        initiatorId: messageThreads.initiatorId,
        authorId:    posts.authorId,
      })
      .from(messageThreads)
      .innerJoin(posts, eq(messageThreads.postId, posts.postId))
      .where(and(eq(messageThreads.threadId, threadId), isNull(messageThreads.deletedAt)))
      .limit(1)

    if (!row) return null
    if (row.initiatorId === profileId) return 'initiator'
    if (row.authorId === profileId) return 'post_owner'
    return null
  }

  static async findAllThreads(
    profileId: string,
    postId?: string,
  ): Promise<MessagesModel['findAllResponse']> {
    const initiatorProfile = alias(userProfiles, 'initiator_profile')
    const authorProfile = alias(userProfiles, 'author_profile')

    const rows = await db
      .select({
        threadId:      messageThreads.threadId,
        postId:        messageThreads.postId,
        postTitle:     posts.postTitle,
        postType:      posts.postType,
        authorId:      posts.authorId,
        initiatorId:   messageThreads.initiatorId,
        initiatorName: initiatorProfile.name,
        authorName:    authorProfile.name,
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
      .innerJoin(posts, and(eq(messageThreads.postId, posts.postId), isNull(posts.deletedAt)))
      .innerJoin(initiatorProfile, eq(messageThreads.initiatorId, initiatorProfile.userProfileId))
      .innerJoin(authorProfile, eq(posts.authorId, authorProfile.userProfileId))
      .where(and(
        isNull(messageThreads.deletedAt),
        or(
          eq(messageThreads.initiatorId, profileId),
          eq(posts.authorId, profileId),
        ),
        postId ? eq(messageThreads.postId, postId) : undefined,
      ))
      .orderBy(desc(sql`
        COALESCE(
          (SELECT m.created_at FROM messages m
           WHERE m.thread_id = ${messageThreads.threadId}
             AND m.deleted_at IS NULL
           ORDER BY m.created_at DESC LIMIT 1),
          ${messageThreads.createdAt}
        )
      `))

    return rows.map((row) => {
      const myRole: Role = row.initiatorId === profileId ? 'initiator' : 'post_owner'
      const otherPartyName = myRole === 'initiator' ? row.authorName : row.initiatorName
      const label = deriveLabel(myRole, row.postType)
      const last = row.lastMessage
      return {
        threadId:       row.threadId,
        postId:         row.postId,
        postTitle:      row.postTitle,
        postType:       row.postType,
        otherPartyName,
        lastMessage: last
          ? {
              content:   last.content,
              createdAt: new Date(last.createdAt),
              sentByMe:  last.senderId === profileId,
            }
          : null,
        unreadCount: row.unreadCount,
        myRole,
        label,
      }
    })
  }

  static async findThreadById(
    threadId: string,
    profileId: string,
  ): Promise<MessagesModel['findThreadResponse'] | null> {
    const initiatorProfile = alias(userProfiles, 'initiator_profile')
    const authorProfile = alias(userProfiles, 'author_profile')

    const [threadRow] = await db
      .select({
        threadId:      messageThreads.threadId,
        postId:        messageThreads.postId,
        postTitle:     posts.postTitle,
        postType:      posts.postType,
        authorId:      posts.authorId,
        initiatorId:   messageThreads.initiatorId,
        initiatorName: initiatorProfile.name,
        authorName:    authorProfile.name,
      })
      .from(messageThreads)
      .innerJoin(posts, and(eq(messageThreads.postId, posts.postId), isNull(posts.deletedAt)))
      .innerJoin(initiatorProfile, eq(messageThreads.initiatorId, initiatorProfile.userProfileId))
      .innerJoin(authorProfile, eq(posts.authorId, authorProfile.userProfileId))
      .where(and(eq(messageThreads.threadId, threadId), isNull(messageThreads.deletedAt)))
      .limit(1)

    if (!threadRow) return null

    const myRole: Role | null =
      threadRow.initiatorId === profileId ? 'initiator' :
      threadRow.authorId === profileId    ? 'post_owner' :
      null

    if (!myRole) return null

    // Mark unread messages (sent by the other party) as read
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(
        eq(messages.threadId, threadId),
        sql`${messages.senderId} != ${profileId}::uuid`,
        isNull(messages.readAt),
        isNull(messages.deletedAt),
      ))

    const msgRows = await db
      .select({
        messageId: messages.messageId,
        content:   messages.content,
        createdAt: messages.createdAt,
        senderId:  messages.senderId,
        readAt:    messages.readAt,
      })
      .from(messages)
      .where(and(eq(messages.threadId, threadId), isNull(messages.deletedAt)))
      .orderBy(messages.createdAt)

    const otherPartyName =
      myRole === 'initiator' ? threadRow.authorName : threadRow.initiatorName

    return {
      threadId:       threadRow.threadId,
      postId:         threadRow.postId,
      postTitle:      threadRow.postTitle,
      postType:       threadRow.postType,
      otherPartyName,
      myRole,
      label: deriveLabel(myRole, threadRow.postType),
      messages: msgRows.map((m) => ({
        messageId: m.messageId,
        content:   m.content,
        createdAt: m.createdAt,
        sentByMe:  m.senderId === profileId,
        readAt:    m.readAt,
      })),
    }
  }

  static async createThread(
    postId: string,
    initiatorProfileId: string,
    content: string,
  ): Promise<{ threadId: string }> {
    return db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(messageThreads)
        .values({ postId, initiatorId: initiatorProfileId })
        .returning({ threadId: messageThreads.threadId })

      await tx.insert(messages).values({
        threadId: thread!.threadId,
        senderId: initiatorProfileId,
        content,
      })

      return { threadId: thread!.threadId }
    })
  }

  static async addMessage(
    threadId: string,
    senderProfileId: string,
    content: string,
  ): Promise<MessagesModel['sendMessageResponse']> {
    const [inserted] = await db
      .insert(messages)
      .values({ threadId, senderId: senderProfileId, content })
      .returning()

    return {
      messageId: inserted!.messageId,
      content:   inserted!.content,
      createdAt: inserted!.createdAt,
      sentByMe:  true,
      readAt:    null,
    }
  }
}
