import { db } from '../../db'
import { reviewImages, reviews, userProfiles } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import {
  ForbiddenError,
  NotFoundError,
  InternalServerError,
  ErrorMessages,
  AuthErrorMessages,
} from '../../lib/errors'
import { uploadReviewImage, deleteUploadedImage } from '../../lib/storage'
import { ProfilesService } from '../profiles/service'

const reviewImageSelect = {
  reviewImageId: reviewImages.reviewImageId,
  reviewId: reviewImages.reviewId,
  name: reviewImages.name,
  link: reviewImages.link,
  createdAt: reviewImages.createdAt,
}

export abstract class ReviewImagesService {
  static async findByReviewId(reviewId: string) {
    return db
      .select(reviewImageSelect)
      .from(reviewImages)
      .where(and(eq(reviewImages.reviewId, reviewId), isNull(reviewImages.deletedAt)))
      .orderBy(reviewImages.createdAt)
  }

  static async findById(reviewImageId: string) {
    const [row] = await db
      .select(reviewImageSelect)
      .from(reviewImages)
      .where(and(eq(reviewImages.reviewImageId, reviewImageId), isNull(reviewImages.deletedAt)))
      .limit(1)
    return row ?? null
  }

  static async create(reviewId: string, data: { link: string; name: string }) {
    const [inserted] = await db
      .insert(reviewImages)
      .values({ reviewId, name: data.name, link: data.link })
      .returning(reviewImageSelect)
    return inserted ?? null
  }

  static async isReviewImageOwnedByAccount(reviewImageId: string, accountId: string) {
    const [row] = await db
      .select({ reviewImageId: reviewImages.reviewImageId })
      .from(reviewImages)
      .innerJoin(reviews, eq(reviewImages.reviewId, reviews.reviewId))
      .innerJoin(userProfiles, eq(reviews.reviewerId, userProfiles.userProfileId))
      .where(
        and(
          eq(reviewImages.reviewImageId, reviewImageId),
          eq(userProfiles.accountId, accountId),
          isNull(reviewImages.deletedAt),
          isNull(reviews.deletedAt),
          isNull(userProfiles.deletedAt),
        ),
      )
      .limit(1)
    return row !== undefined
  }

  static async delete(reviewImageId: string) {
    const [deleted] = await db
      .update(reviewImages)
      .set({ deletedAt: new Date() })
      .where(and(eq(reviewImages.reviewImageId, reviewImageId), isNull(reviewImages.deletedAt)))
      .returning({ reviewImageId: reviewImages.reviewImageId })
    return deleted ?? null
  }

  static async deleteWithOwnershipCheck(reviewImageId: string, accountId: string) {
    const image = await this.findById(reviewImageId)
    if (!image) throw new NotFoundError(ErrorMessages.reviewImageNotFound)

    const isOwner = await this.isReviewImageOwnedByAccount(reviewImageId, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

    await this.delete(reviewImageId)
  }

  static async createForReview(reviewId: string, accountId: string, file: File) {
    const [review] = await db
      .select({ reviewerId: reviews.reviewerId })
      .from(reviews)
      .where(and(eq(reviews.reviewId, reviewId), isNull(reviews.deletedAt)))
      .limit(1)
    if (!review) throw new NotFoundError(ErrorMessages.reviewNotFound)

    const isOwner = await ProfilesService.isProfileOwnedByAccount(review.reviewerId, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const link = await uploadReviewImage(file, reviewId)
    const created = await this.create(reviewId, { link, name: file.name })
    if (!created) {
      await deleteUploadedImage(link).catch(() => {})
      throw new InternalServerError('Failed to save review image')
    }
    return created
  }
}
