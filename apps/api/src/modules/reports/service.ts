import { db } from '../../db'
import { reports, posts } from '../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import type { ReportsModel } from './model'
import { NotFoundError, ForbiddenError, ConflictError, ErrorMessages, AuthErrorMessages } from '../../lib/errors'
import { ProfilesService } from '../profiles/service'

export abstract class ReportsService {
  /**
   * Create a report for a post.
   * @throws NotFoundError if post doesn't exist or is deleted
   * @throws ForbiddenError if reporter is the post author
   * @throws ConflictError if reporter already has an active report for this post
   */
  static async create(
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

      const [existing] = await tx
        .select({ reportId: reports.reportId })
        .from(reports)
        .where(
          and(
            eq(reports.postId, postId),
            eq(reports.reporterId, reporterId),
            isNull(reports.deletedAt),
          ),
        )
        .limit(1)

      if (existing) throw new ConflictError(ErrorMessages.alreadyReported)

      const [report] = await tx
        .insert(reports)
        .values({ postId, reporterId, reason: String(body.reason), description: body.description })
        .returning()

      return report!
    })
  }

  /**
   * Check if a user has already reported a post.
   */
  static async hasReported(postId: string, reporterId: string): Promise<boolean> {
    const [report] = await db
      .select({ reportId: reports.reportId })
      .from(reports)
      .where(
        and(
          eq(reports.postId, postId),
          eq(reports.reporterId, reporterId),
          isNull(reports.deletedAt),
        ),
      )
      .limit(1)

    return !!report
  }

  /**
   * Create a report on behalf of the account's primary profile.
   * @throws ForbiddenError if account has no profile
   */
  static async createForAccount(
    accountId: string,
    postId: string,
    body: ReportsModel['createBody'],
  ): Promise<ReportsModel['createResponse']> {
    const profiles = await ProfilesService.findByAccountId(accountId)
    if (!profiles.length) throw new ForbiddenError(AuthErrorMessages.forbidden)
    return this.create(postId, profiles[0]!.userProfileId, body)
  }

  /**
   * Check if an account's primary profile has already reported a post.
   */
  static async hasReportedForAccount(accountId: string, postId: string): Promise<boolean> {
    const profiles = await ProfilesService.findByAccountId(accountId)
    if (!profiles.length) return false
    return this.hasReported(postId, profiles[0]!.userProfileId)
  }
}
