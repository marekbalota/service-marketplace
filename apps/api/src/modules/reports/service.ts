import { db } from '../../db'
import { reports, posts, messages, reviews } from '../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import type { ReportsModel } from './model'
import { NotFoundError, ForbiddenError, ConflictError, ErrorMessages, AuthErrorMessages } from '../../lib/errors'
import { ProfilesService } from '../profiles/service'

export abstract class ReportsService {
  // ── Posts ──────────────────────────────────────────────────────────────

  static async createForPost(
    postId: string,
    reporterId: string,
    body: ReportsModel['postCreateBody'],
  ): Promise<ReportsModel['createResponse']> {
    return db.transaction(async (tx) => {
      const [post] = await tx
        .select({ postId: posts.postId, authorId: posts.authorId })
        .from(posts)
        .where(and(eq(posts.postId, postId), isNull(posts.deletedAt)))
        .limit(1)

      if (!post) throw new NotFoundError(ErrorMessages.postNotFound)
      if (post.authorId === reporterId) throw new ForbiddenError(AuthErrorMessages.forbidden)

      const [existing] = await tx
        .select({ reportId: reports.reportId })
        .from(reports)
        .where(and(eq(reports.postId, postId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
        .limit(1)

      if (existing) throw new ConflictError(ErrorMessages.alreadyReported)

      const [report] = await tx
        .insert(reports)
        .values({ postId, reporterId, reason: String(body.reason), description: body.description ?? null })
        .returning()

      return report!
    })
  }

  static async hasReportedPost(postId: string, reporterId: string): Promise<boolean> {
    const [report] = await db
      .select({ reportId: reports.reportId })
      .from(reports)
      .where(and(eq(reports.postId, postId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
      .limit(1)

    return !!report
  }

  static async createForPostForAccount(
    accountId: string,
    postId: string,
    body: ReportsModel['postCreateBody'],
  ): Promise<ReportsModel['createResponse']> {
    const profiles = await ProfilesService.findByAccountId(accountId)
    if (!profiles.length) throw new ForbiddenError(AuthErrorMessages.forbidden)
    return this.createForPost(postId, profiles[0]!.userProfileId, body)
  }

  static async hasReportedPostForAccount(accountId: string, postId: string): Promise<boolean> {
    const profiles = await ProfilesService.findByAccountId(accountId)
    if (!profiles.length) return false
    return this.hasReportedPost(postId, profiles[0]!.userProfileId)
  }

  // ── Messages ───────────────────────────────────────────────────────────

  static async createForMessage(
    messageId: string,
    reporterId: string,
    body: ReportsModel['messageCreateBody'],
  ): Promise<ReportsModel['createResponse']> {
    return db.transaction(async (tx) => {
      const [message] = await tx
        .select({ messageId: messages.messageId, senderId: messages.senderId })
        .from(messages)
        .where(and(eq(messages.messageId, messageId), isNull(messages.deletedAt)))
        .limit(1)

      if (!message) throw new NotFoundError(ErrorMessages.messageNotFound)
      if (message.senderId === reporterId) throw new ForbiddenError(AuthErrorMessages.forbidden)

      const [existing] = await tx
        .select({ reportId: reports.reportId })
        .from(reports)
        .where(and(eq(reports.messageId, messageId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
        .limit(1)

      if (existing) throw new ConflictError(ErrorMessages.alreadyReported)

      const [report] = await tx
        .insert(reports)
        .values({ messageId, reporterId, reason: String(body.reason), description: body.description ?? null })
        .returning()

      return report!
    })
  }

  static async hasReportedMessage(messageId: string, reporterId: string): Promise<boolean> {
    const [report] = await db
      .select({ reportId: reports.reportId })
      .from(reports)
      .where(and(eq(reports.messageId, messageId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
      .limit(1)

    return !!report
  }

  static async createForMessageForAccount(
    accountId: string,
    messageId: string,
    body: ReportsModel['messageCreateBody'],
  ): Promise<ReportsModel['createResponse']> {
    const profiles = await ProfilesService.findByAccountId(accountId)
    if (!profiles.length) throw new ForbiddenError(AuthErrorMessages.forbidden)
    return this.createForMessage(messageId, profiles[0]!.userProfileId, body)
  }

  static async hasReportedMessageForAccount(accountId: string, messageId: string): Promise<boolean> {
    const profiles = await ProfilesService.findByAccountId(accountId)
    if (!profiles.length) return false
    return this.hasReportedMessage(messageId, profiles[0]!.userProfileId)
  }

  // ── Reviews ────────────────────────────────────────────────────────────

  static async createForReview(
    reviewId: string,
    reporterId: string,
    body: ReportsModel['reviewCreateBody'],
  ): Promise<ReportsModel['createResponse']> {
    return db.transaction(async (tx) => {
      const [review] = await tx
        .select({ reviewId: reviews.reviewId, reviewerId: reviews.reviewerId })
        .from(reviews)
        .where(and(eq(reviews.reviewId, reviewId), isNull(reviews.deletedAt)))
        .limit(1)

      if (!review) throw new NotFoundError(ErrorMessages.reviewNotFound)
      if (review.reviewerId === reporterId) throw new ForbiddenError(AuthErrorMessages.forbidden)

      const [existing] = await tx
        .select({ reportId: reports.reportId })
        .from(reports)
        .where(and(eq(reports.reviewId, reviewId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
        .limit(1)

      if (existing) throw new ConflictError(ErrorMessages.alreadyReported)

      const [report] = await tx
        .insert(reports)
        .values({ reviewId, reporterId, reason: String(body.reason), description: body.description ?? null })
        .returning()

      return report!
    })
  }

  static async hasReportedReview(reviewId: string, reporterId: string): Promise<boolean> {
    const [report] = await db
      .select({ reportId: reports.reportId })
      .from(reports)
      .where(and(eq(reports.reviewId, reviewId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
      .limit(1)

    return !!report
  }

  static async createForReviewForAccount(
    accountId: string,
    reviewId: string,
    body: ReportsModel['reviewCreateBody'],
  ): Promise<ReportsModel['createResponse']> {
    const profiles = await ProfilesService.findByAccountId(accountId)
    if (!profiles.length) throw new ForbiddenError(AuthErrorMessages.forbidden)
    return this.createForReview(reviewId, profiles[0]!.userProfileId, body)
  }

  static async hasReportedReviewForAccount(accountId: string, reviewId: string): Promise<boolean> {
    const profiles = await ProfilesService.findByAccountId(accountId)
    if (!profiles.length) return false
    return this.hasReportedReview(reviewId, profiles[0]!.userProfileId)
  }
}
