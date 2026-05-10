import { db } from '../../db'
import { images, userProfiles } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { ForbiddenError, NotFoundError, InternalServerError, ErrorMessages, AuthErrorMessages } from '../../lib/errors'
import { uploadImage, deleteUploadedImage } from '../../lib/storage'
import { ProfilesService } from '../profiles/service'

const imageSelect = {
  imageId:       images.imageId,
  userProfileId: images.userProfileId,
  name:          images.name,
  link:          images.link,
  createdAt:     images.createdAt,
}

export abstract class ImagesService {
  static async findByProfileId(profileId: string) {
    return db
      .select(imageSelect)
      .from(images)
      .where(and(eq(images.userProfileId, profileId), isNull(images.deletedAt)))
      .orderBy(images.createdAt)
  }

  static async create(profileId: string, data: { link: string; name: string }) {
    const [inserted] = await db
      .insert(images)
      .values({ userProfileId: profileId, name: data.name, link: data.link })
      .returning(imageSelect)
    return inserted ?? null
  }

  static async findById(imageId: string) {
    const [row] = await db
      .select(imageSelect)
      .from(images)
      .where(and(eq(images.imageId, imageId), isNull(images.deletedAt)))
      .limit(1)
    return row ?? null
  }

  static async isImageOwnedByAccount(imageId: string, accountId: string) {
    const [row] = await db
      .select({ imageId: images.imageId })
      .from(images)
      .innerJoin(userProfiles, eq(images.userProfileId, userProfiles.userProfileId))
      .where(
        and(
          eq(images.imageId, imageId),
          eq(userProfiles.accountId, accountId),
          isNull(images.deletedAt),
          isNull(userProfiles.deletedAt),
        ),
      )
      .limit(1)
    return row !== undefined
  }

  static async delete(imageId: string) {
    const [deleted] = await db
      .update(images)
      .set({ deletedAt: new Date() })
      .where(and(eq(images.imageId, imageId), isNull(images.deletedAt)))
      .returning({ imageId: images.imageId })
    return deleted ?? null
  }

  static async deleteWithOwnershipCheck(imageId: string, accountId: string) {
    const image = await this.findById(imageId)
    if (!image) throw new NotFoundError(ErrorMessages.imageNotFound)

    const isOwner = await this.isImageOwnedByAccount(imageId, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

    await this.delete(imageId)
  }

  static async createForProfileByUrl(profileId: string, accountId: string, url: string) {
    const isOwner = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const name = new URL(url).pathname.split('/').pop() ?? url
    const created = await this.create(profileId, { link: url, name })
    if (!created) throw new InternalServerError('Failed to save image')
    return created
  }

  static async createForProfile(profileId: string, accountId: string, file: File) {
    const isOwner = await ProfilesService.isProfileOwnedByAccount(profileId, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const link = await uploadImage(file, profileId)
    const created = await this.create(profileId, { link, name: file.name })
    if (!created) {
      await deleteUploadedImage(link).catch(() => {})
      throw new InternalServerError('Failed to save image')
    }
    return created
  }
}
