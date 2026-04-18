import { db } from '../../db'
import { reviews, userProfiles, posts } from '../../db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import type { ReviewsModel } from './model'

export abstract class ReviewsService {
  /**
   * Create a new review for a post.
   * @throws Error with code 'ALREADY_REVIEWED' if user already has an active review for this post
   * @throws Error with code 'POST_NOT_FOUND' if post doesn't exist or is deleted
   */
  static async create(
    postId: string,
    reviewerId: string,
    body: ReviewsModel['createBody'],
  ): Promise<ReviewsModel['createResponse']> {
    return db.transaction(async (tx) => {
      // Check if post exists and is not deleted
      const [post] = await tx
        .select({ postId: posts.postId })
        .from(posts)
        .where(and(eq(posts.postId, postId), isNull(posts.deletedAt)))
        .limit(1)

      if (!post) {
        const error = new Error('Post not found')
        ;(error as Error & { code: string }).code = 'POST_NOT_FOUND'
        throw error
      }

      // Check if user already has an active review for this post
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

      if (existingReview) {
        const error = new Error('User already has an active review for this post')
        ;(error as Error & { code: string }).code = 'ALREADY_REVIEWED'
        throw error
      }

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
   * @returns true if deleted, false if not found or already deleted
   * @throws Error with code 'FORBIDDEN' if review doesn't belong to user
   */
  static async delete(reviewId: string, reviewerId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [review] = await tx
        .select({ reviewerId: reviews.reviewerId, deletedAt: reviews.deletedAt })
        .from(reviews)
        .where(eq(reviews.reviewId, reviewId))
        .limit(1)

      if (!review) return false

      if (review.reviewerId !== reviewerId) {
        const error = new Error('Review does not belong to user')
        ;(error as Error & { code: string }).code = 'FORBIDDEN'
        throw error
      }

      if (review.deletedAt !== null) return false

      const [updated] = await tx
        .update(reviews)
        .set({ deletedAt: new Date() })
        .where(eq(reviews.reviewId, reviewId))
        .returning({ reviewId: reviews.reviewId })

      return !!updated
    })
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
