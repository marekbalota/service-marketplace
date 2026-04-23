import { db } from '../../db'
import { reviews, posts } from '../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import type { ReviewsModel } from './model'
import { NotFoundError, ForbiddenError, ConflictError, ErrorMessages, AuthErrorMessages } from '../../lib/errors'
import { ProfilesService } from '../profiles/service'

export abstract class ReviewsService {
  /**
   * Create a new review for a post.
   * @throws NotFoundError if post doesn't exist or is deleted
   * @throws ConflictError if reviewer already has an active review for this post
   */
  static async create(
    postId: string,
    reviewerId: string,
    body: ReviewsModel['createBody'],
  ): Promise<ReviewsModel['createResponse']> {
    return db.transaction(async (tx) => {
      const [post] = await tx
        .select({ postId: posts.postId })
        .from(posts)
        .where(and(eq(posts.postId, postId), isNull(posts.deletedAt)))
        .limit(1)

      if (!post) throw new NotFoundError(ErrorMessages.postNotFound)

      const [existingReview] = await tx
        .select({ reviewId: reviews.reviewId })
        .from(reviews)
        .where(
          and(
            eq(reviews.postId, postId),
            eq(reviews.reviewerId, reviewerId),
            isNull(reviews.deletedAt),
          ),
        )
        .limit(1)

      if (existingReview) throw new ConflictError(ErrorMessages.alreadyReviewed)

      const [review] = await tx
        .insert(reviews)
        .values({
          postId,
          reviewerId,
          rating: body.rating,
          reviewDescription: body.reviewDescription ?? null,
        })
        .returning()

      return review!
    })
  }

  /**
   * Soft delete a review.
   * @throws NotFoundError if review doesn't exist or is already deleted
   * @throws ForbiddenError if review doesn't belong to the reviewer
   */
  static async delete(reviewId: string, reviewerId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [review] = await tx
        .select({ reviewerId: reviews.reviewerId, deletedAt: reviews.deletedAt })
        .from(reviews)
        .where(eq(reviews.reviewId, reviewId))
        .limit(1)

      if (!review || review.deletedAt !== null) throw new NotFoundError(ErrorMessages.reviewNotFound)
      if (review.reviewerId !== reviewerId) throw new ForbiddenError(AuthErrorMessages.forbidden)

      await tx
        .update(reviews)
        .set({ deletedAt: new Date() })
        .where(eq(reviews.reviewId, reviewId))
    })
  }

  /**
   * Create a review on behalf of the specified profile.
   * @throws ForbiddenError if profile doesn't belong to the account
   * @throws NotFoundError if post doesn't exist or is deleted
   * @throws ConflictError if the profile already has an active review for this post
   */
  static async createWithOwnerShipCheck(
    accountId: string,
    postId: string,
    body: ReviewsModel['createBody'],
  ): Promise<ReviewsModel['createResponse']> {
    const isOwner = await ProfilesService.isProfileOwnedByAccount(body.profileId, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)
    return this.create(postId, body.profileId, body)
  }

  /**
   * Delete a review on behalf of the account.
   * @throws ForbiddenError if review doesn't belong to any profile owned by the account
   * @throws NotFoundError if review doesn't exist or is already deleted
   */
  static async deleteForAccount(accountId: string, reviewId: string): Promise<void> {
    const review = await this.findById(reviewId)
    if (!review || review.deletedAt !== null) throw new NotFoundError(ErrorMessages.reviewNotFound)

    const isOwner = await ProfilesService.isProfileOwnedByAccount(review.reviewerId, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

    await this.delete(reviewId, review.reviewerId)
  }

  /**
   * Check if a user has already reviewed a post.
   */
  static async hasReviewed(postId: string, reviewerId: string): Promise<boolean> {
    const [review] = await db
      .select({ reviewId: reviews.reviewId })
      .from(reviews)
      .where(
        and(
          eq(reviews.postId, postId),
          eq(reviews.reviewerId, reviewerId),
          isNull(reviews.deletedAt),
        ),
      )
      .limit(1)

    return !!review
  }

  /**
   * Get a review by ID (including deleted).
   */
  static async findById(reviewId: string) {
    const [review] = await db
      .select({
        reviewId: reviews.reviewId,
        reviewerId: reviews.reviewerId,
        postId: reviews.postId,
        rating: reviews.rating,
        reviewDescription: reviews.reviewDescription,
        createdAt: reviews.createdAt,
        deletedAt: reviews.deletedAt,
      })
      .from(reviews)
      .where(eq(reviews.reviewId, reviewId))
      .limit(1)

    return review ?? null
  }
}
