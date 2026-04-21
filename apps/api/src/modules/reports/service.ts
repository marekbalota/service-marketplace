import { db } from '../../db'
import { reports, posts, messages, reviews, reportCategories } from '../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import type { ReportsModel } from './model'
import { NotFoundError, ForbiddenError, ConflictError, ErrorMessages, AuthErrorMessages } from '../../lib/errors'
import { ProfilesService } from '../profiles/service'

type TargetType = 'POST' | 'MESSAGE' | 'REVIEW'

async function resolveCategory(categoryId: string, targetType: TargetType) {
  const [cat] = await db
    .select({ categoryId: reportCategories.categoryId, targetType: reportCategories.targetType })
    .from(reportCategories)
    .where(and(eq(reportCategories.categoryId, categoryId), isNull(reportCategories.deletedAt)))
    .limit(1)

  if (!cat || cat.targetType !== targetType) {
    throw new NotFoundError('Report category not found')
  }
  return cat
}

export abstract class ReportsService {
  // ── Categories ─────────────────────────────────────────────────────────

  static async findCategories(targetType: TargetType) {
    return db
      .select({
        categoryId: reportCategories.categoryId,
        targetType: reportCategories.targetType,
        value: reportCategories.value,
        label: reportCategories.label,
      })
      .from(reportCategories)
      .where(and(eq(reportCategories.targetType, targetType), isNull(reportCategories.deletedAt)))
  }

  // ── Posts ──────────────────────────────────────────────────────────────

  static async createForPost(
    postId: string,
    reporterId: string,
    body: ReportsModel['createBody'],
  ): Promise<ReportsModel['createResponse']> {
    return db.transaction(async (tx) => {
      const [post] = await tx
        .select({ postId: posts.postId, authorId: posts.authorId })
        .from(posts)
        .where(and(eq(posts.postId, postId), isNull(posts.deletedAt)))
        .limit(1)

      if (!post) throw new NotFoundError(ErrorMessages.postNotFound)
      if (post.authorId === reporterId) throw new ForbiddenError(AuthErrorMessages.forbidden)

      await resolveCategory(body.categoryId, 'POST')

      const [existing] = await tx
        .select({ reportId: reports.reportId })
        .from(reports)
        .where(and(eq(reports.postId, postId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
        .limit(1)

      if (existing) throw new ConflictError(ErrorMessages.alreadyReported)

      const [report] = await tx
        .insert(reports)
        .values({ postId, reporterId, categoryId: body.categoryId, description: body.description ?? null })
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
    body: ReportsModel['createBody'],
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
    body: ReportsModel['createBody'],
  ): Promise<ReportsModel['createResponse']> {
    return db.transaction(async (tx) => {
      const [message] = await tx
        .select({ messageId: messages.messageId, senderId: messages.senderId })
        .from(messages)
        .where(and(eq(messages.messageId, messageId), isNull(messages.deletedAt)))
        .limit(1)

      if (!message) throw new NotFoundError(ErrorMessages.messageNotFound)
      if (message.senderId === reporterId) throw new ForbiddenError(AuthErrorMessages.forbidden)

      await resolveCategory(body.categoryId, 'MESSAGE')

      const [existing] = await tx
        .select({ reportId: reports.reportId })
        .from(reports)
        .where(and(eq(reports.messageId, messageId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
        .limit(1)

      if (existing) throw new ConflictError(ErrorMessages.alreadyReported)

      const [report] = await tx
        .insert(reports)
        .values({ messageId, reporterId, categoryId: body.categoryId, description: body.description ?? null })
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
    body: ReportsModel['createBody'],
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
    body: ReportsModel['createBody'],
  ): Promise<ReportsModel['createResponse']> {
    return db.transaction(async (tx) => {
      const [review] = await tx
        .select({ reviewId: reviews.reviewId, reviewerId: reviews.reviewerId })
        .from(reviews)
        .where(and(eq(reviews.reviewId, reviewId), isNull(reviews.deletedAt)))
        .limit(1)

      if (!review) throw new NotFoundError(ErrorMessages.reviewNotFound)
      if (review.reviewerId === reporterId) throw new ForbiddenError(AuthErrorMessages.forbidden)

      await resolveCategory(body.categoryId, 'REVIEW')

      const [existing] = await tx
        .select({ reportId: reports.reportId })
        .from(reports)
        .where(and(eq(reports.reviewId, reviewId), eq(reports.reporterId, reporterId), isNull(reports.deletedAt)))
        .limit(1)

      if (existing) throw new ConflictError(ErrorMessages.alreadyReported)

      const [report] = await tx
        .insert(reports)
        .values({ reviewId, reporterId, categoryId: body.categoryId, description: body.description ?? null })
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
    body: ReportsModel['createBody'],
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
