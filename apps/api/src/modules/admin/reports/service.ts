import { db } from '../../../db'
import {
  reports,
  reportCategories,
  posts,
  messages,
  reviews,
  users,
  userProfiles,
} from '../../../db/schema'
import { eq, and, isNull, count, desc, ilike, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { AdminReportsModel } from './model'
import { NotFoundError, ErrorMessages } from '../../../lib/errors'

const PAGE_SIZE = 10

const reporterProfile = alias(userProfiles, 'reporter_profile')
const postAuthorProfile = alias(userProfiles, 'post_author_profile')
const postAuthorUser = alias(users, 'post_author_user')
const msgSenderProfile = alias(userProfiles, 'msg_sender_profile')
const msgSenderUser = alias(users, 'msg_sender_user')
const reviewerProfile = alias(userProfiles, 'reviewer_profile')
const reviewerUser = alias(users, 'reviewer_user')

type ReportsQuery = AdminReportsModel['reportsQuery']

function buildListConditions(query: ReportsQuery) {
  return and(
    isNull(reports.deletedAt),
    query.targetType ? eq(reportCategories.targetType, query.targetType) : undefined,
    query.categoryId ? eq(reports.categoryId, query.categoryId) : undefined,
    query.status ? eq(reports.status, query.status) : undefined,
    query.q
      ? or(
          ilike(postAuthorProfile.name, `%${query.q}%`),
          ilike(postAuthorProfile.email, `%${query.q}%`),
          ilike(msgSenderProfile.name, `%${query.q}%`),
          ilike(msgSenderProfile.email, `%${query.q}%`),
          ilike(reviewerProfile.name, `%${query.q}%`),
          ilike(reviewerProfile.email, `%${query.q}%`),
        )
      : undefined,
  )
}

export abstract class AdminReportsService {
  static async findAll(query: ReportsQuery) {
    const page = Math.max(1, query.page ?? 1)
    const offset = (page - 1) * PAGE_SIZE

    const listConditions = buildListConditions(query)

    return db.transaction(async (tx) => {
      const countQuery = (where: Parameters<typeof and>[0]) =>
        tx
          .select({ total: count() })
          .from(reports)
          .innerJoin(reportCategories, eq(reports.categoryId, reportCategories.categoryId))
          .leftJoin(posts, eq(reports.postId, posts.postId))
          .leftJoin(postAuthorProfile, eq(posts.authorId, postAuthorProfile.userProfileId))
          .leftJoin(messages, eq(reports.messageId, messages.messageId))
          .leftJoin(msgSenderProfile, eq(messages.senderId, msgSenderProfile.userProfileId))
          .leftJoin(reviews, eq(reports.reviewId, reviews.reviewId))
          .leftJoin(reviewerProfile, eq(reviews.reviewerId, reviewerProfile.userProfileId))
          .where(where)

      const [totalRow] = await countQuery(listConditions)
      const [pendingRow] = await countQuery(and(listConditions, eq(reports.status, 'PENDING')))
      const [resolvedRow] = await countQuery(and(listConditions, eq(reports.status, 'RESOLVED')))
      const [dismissedRow] = await countQuery(and(listConditions, eq(reports.status, 'DISMISSED')))

      const total = totalRow?.total ?? 0
      const totalPending = pendingRow?.total ?? 0
      const totalResolved = resolvedRow?.total ?? 0
      const totalDismissed = dismissedRow?.total ?? 0

      const rows = await tx
        .select({
          reportId: reports.reportId,
          status: reports.status,
          description: reports.description,
          createdAt: reports.createdAt,
          postId: reports.postId,
          messageId: reports.messageId,
          reviewId: reports.reviewId,
          targetType: reportCategories.targetType,
          categoryLabel: reportCategories.label,
          reporterName: reporterProfile.name,
          reporterEmail: reporterProfile.email,
          postTitle: posts.postTitle,
          postAuthorProfileName: postAuthorProfile.name,
          postAuthorProfileEmail: postAuthorProfile.email,
          postAuthorUserId: postAuthorUser.id,
          postAuthorUserIsBanned: postAuthorUser.isBanned,
          messageCreatedAt: messages.createdAt,
          msgSenderProfileName: msgSenderProfile.name,
          msgSenderProfileEmail: msgSenderProfile.email,
          msgSenderUserId: msgSenderUser.id,
          msgSenderUserIsBanned: msgSenderUser.isBanned,
          reviewCreatedAt: reviews.createdAt,
          reviewPostId: reviews.postId,
          reviewerProfileName: reviewerProfile.name,
          reviewerProfileEmail: reviewerProfile.email,
          reviewerUserId: reviewerUser.id,
          reviewerUserIsBanned: reviewerUser.isBanned,
        })
        .from(reports)
        .innerJoin(reportCategories, eq(reports.categoryId, reportCategories.categoryId))
        .innerJoin(reporterProfile, eq(reports.reporterId, reporterProfile.userProfileId))
        .leftJoin(posts, eq(reports.postId, posts.postId))
        .leftJoin(postAuthorProfile, eq(posts.authorId, postAuthorProfile.userProfileId))
        .leftJoin(postAuthorUser, eq(postAuthorProfile.accountId, postAuthorUser.id))
        .leftJoin(messages, eq(reports.messageId, messages.messageId))
        .leftJoin(msgSenderProfile, eq(messages.senderId, msgSenderProfile.userProfileId))
        .leftJoin(msgSenderUser, eq(msgSenderProfile.accountId, msgSenderUser.id))
        .leftJoin(reviews, eq(reports.reviewId, reviews.reviewId))
        .leftJoin(reviewerProfile, eq(reviews.reviewerId, reviewerProfile.userProfileId))
        .leftJoin(reviewerUser, eq(reviewerProfile.accountId, reviewerUser.id))
        .where(listConditions)
        .orderBy(desc(reports.createdAt))
        .offset(offset)
        .limit(PAGE_SIZE)

      const items = rows.map((row) => {
        let reportedItem: string
        let reportedUserId: string | null = null
        let reportedUserName: string | null = null
        let reportedUserEmail: string | null = null
        let reportedUserIsBanned: boolean | null = null

        if (row.postId) {
          reportedItem = row.postTitle ?? 'Deleted post'
          reportedUserId = row.postAuthorUserId ?? null
          reportedUserName = row.postAuthorProfileName ?? null
          reportedUserEmail = row.postAuthorProfileEmail ?? null
          reportedUserIsBanned = row.postAuthorUserIsBanned ?? null
        } else if (row.messageId) {
          const date = row.messageCreatedAt
            ? new Date(row.messageCreatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : ''
          reportedItem = `Message in thread (${date})`
          reportedUserId = row.msgSenderUserId ?? null
          reportedUserName = row.msgSenderProfileName ?? null
          reportedUserEmail = row.msgSenderProfileEmail ?? null
          reportedUserIsBanned = row.msgSenderUserIsBanned ?? null
        } else {
          const date = row.reviewCreatedAt
            ? new Date(row.reviewCreatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : ''
          reportedItem = `Review (${date})`
          reportedUserId = row.reviewerUserId ?? null
          reportedUserName = row.reviewerProfileName ?? null
          reportedUserEmail = row.reviewerProfileEmail ?? null
          reportedUserIsBanned = row.reviewerUserIsBanned ?? null
        }

        return {
          reportId: row.reportId,
          targetType: row.targetType,
          reportedItem,
          reporterName: row.reporterName,
          reporterEmail: row.reporterEmail,
          reportedUserId,
          reportedUserName,
          reportedUserEmail,
          reportedUserIsBanned,
          categoryLabel: row.categoryLabel,
          description: row.description,
          createdAt: row.createdAt,
          status: row.status,
          postId: row.postId ?? null,
          reviewPostId: row.reviewPostId ?? null,
        }
      })

      return {
        items,
        total,
        totalPending,
        totalResolved,
        totalDismissed,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      }
    })
  }

  static async resolve(reportId: string) {
    const [existing] = await db
      .select({ reportId: reports.reportId })
      .from(reports)
      .where(and(eq(reports.reportId, reportId), isNull(reports.deletedAt)))
      .limit(1)

    if (!existing) throw new NotFoundError(ErrorMessages.reportNotFound)

    await db.update(reports).set({ status: 'RESOLVED' }).where(eq(reports.reportId, reportId))
  }

  static async getMessageContext(reportId: string) {
    const [report] = await db
      .select({ messageId: reports.messageId })
      .from(reports)
      .where(and(eq(reports.reportId, reportId), isNull(reports.deletedAt)))
      .limit(1)

    if (!report) throw new NotFoundError(ErrorMessages.reportNotFound)
    if (!report.messageId) throw new NotFoundError(ErrorMessages.reportNotFound)

    const [reportedMsg] = await db
      .select({ threadId: messages.threadId, createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.messageId, report.messageId))
      .limit(1)

    if (!reportedMsg) throw new NotFoundError(ErrorMessages.reportNotFound)

    const contextSenderProfile = alias(userProfiles, 'context_sender_profile')

    // Fetch all non-deleted messages in the thread ordered chronologically,
    // then slice in JS. Avoids timestamp precision loss (JS Date is ms, DB is µs)
    // that would cause lte comparisons to silently exclude messages with the
    // same sub-millisecond timestamp as the reported message.
    const allMessages = await db
      .select({
        messageId: messages.messageId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderName: contextSenderProfile.name,
      })
      .from(messages)
      .innerJoin(contextSenderProfile, eq(messages.senderId, contextSenderProfile.userProfileId))
      .where(and(eq(messages.threadId, reportedMsg.threadId), isNull(messages.deletedAt)))
      .orderBy(messages.createdAt)

    const reportedIdx = allMessages.findIndex((m) => m.messageId === report.messageId)
    const start = Math.max(0, reportedIdx - 5)

    return {
      messages: allMessages.slice(start, reportedIdx + 1).map((row) => ({
        ...row,
        isReported: row.messageId === report.messageId,
      })),
    }
  }

  static async dismiss(reportId: string) {
    const [existing] = await db
      .select({ reportId: reports.reportId })
      .from(reports)
      .where(and(eq(reports.reportId, reportId), isNull(reports.deletedAt)))
      .limit(1)

    if (!existing) throw new NotFoundError(ErrorMessages.reportNotFound)

    await db.update(reports).set({ status: 'DISMISSED' }).where(eq(reports.reportId, reportId))
  }
}
