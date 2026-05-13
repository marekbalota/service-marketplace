import { db } from '../../../db'
import { reports, reportCategories, posts, messages, reviews, users, userProfiles } from '../../../db/schema'
import { eq, and, isNull, count } from 'drizzle-orm'
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

function buildBaseConditions(query: ReportsQuery) {
  return and(
    isNull(reports.deletedAt),
    query.targetType ? eq(reportCategories.targetType, query.targetType) : undefined,
    query.categoryId ? eq(reports.categoryId, query.categoryId) : undefined,
  )
}

function buildListConditions(query: ReportsQuery) {
  return and(
    buildBaseConditions(query),
    query.status ? eq(reports.status, query.status) : undefined,
  )
}

export abstract class AdminReportsService {
  static async findAll(query: ReportsQuery) {
    const page = Math.max(1, query.page ?? 1)
    const offset = (page - 1) * PAGE_SIZE

    const baseConditions = buildBaseConditions(query)
    const listConditions = buildListConditions(query)

    return db.transaction(async (tx) => {
      const [totalRow] = await tx
        .select({ total: count() })
        .from(reports)
        .innerJoin(reportCategories, eq(reports.categoryId, reportCategories.categoryId))
        .where(listConditions)

      const [pendingRow] = await tx
        .select({ total: count() })
        .from(reports)
        .innerJoin(reportCategories, eq(reports.categoryId, reportCategories.categoryId))
        .where(and(baseConditions, eq(reports.status, 'pending')))

      const [resolvedRow] = await tx
        .select({ total: count() })
        .from(reports)
        .innerJoin(reportCategories, eq(reports.categoryId, reportCategories.categoryId))
        .where(and(baseConditions, eq(reports.status, 'resolved')))

      const [dismissedRow] = await tx
        .select({ total: count() })
        .from(reports)
        .innerJoin(reportCategories, eq(reports.categoryId, reportCategories.categoryId))
        .where(and(baseConditions, eq(reports.status, 'dismissed')))

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
          postTitle: posts.postTitle,
          postAuthorProfileName: postAuthorProfile.name,
          postAuthorUserId: postAuthorUser.id,
          postAuthorUserIsBanned: postAuthorUser.isBanned,
          messageCreatedAt: messages.createdAt,
          msgSenderProfileName: msgSenderProfile.name,
          msgSenderUserId: msgSenderUser.id,
          msgSenderUserIsBanned: msgSenderUser.isBanned,
          reviewCreatedAt: reviews.createdAt,
          reviewerProfileName: reviewerProfile.name,
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
        .orderBy(reports.createdAt)
        .offset(offset)
        .limit(PAGE_SIZE)

      const items = rows.map((row) => {
        let reportedItem: string
        let reportedUserId: string | null = null
        let reportedUserName: string | null = null
        let reportedUserIsBanned: boolean | null = null

        if (row.postId) {
          reportedItem = row.postTitle ?? 'Deleted post'
          reportedUserId = row.postAuthorUserId ?? null
          reportedUserName = row.postAuthorProfileName ?? null
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
          reportedUserIsBanned = row.reviewerUserIsBanned ?? null
        }

        return {
          reportId: row.reportId,
          targetType: row.targetType,
          reportedItem,
          reporterName: row.reporterName,
          reportedUserId,
          reportedUserName,
          reportedUserIsBanned,
          categoryLabel: row.categoryLabel,
          description: row.description,
          createdAt: row.createdAt,
          status: row.status,
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

    await db
      .update(reports)
      .set({ status: 'resolved' })
      .where(eq(reports.reportId, reportId))
  }

  static async dismiss(reportId: string) {
    const [existing] = await db
      .select({ reportId: reports.reportId })
      .from(reports)
      .where(and(eq(reports.reportId, reportId), isNull(reports.deletedAt)))
      .limit(1)

    if (!existing) throw new NotFoundError(ErrorMessages.reportNotFound)

    await db
      .update(reports)
      .set({ status: 'dismissed' })
      .where(eq(reports.reportId, reportId))
  }
}
