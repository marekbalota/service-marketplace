import { db } from '../../db'
import { images, userProfiles } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

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

  static async create(profileId: string, body: { link: string }) {
    const [inserted] = await db
      .insert(images)
      .values({ userProfileId: profileId, name: body.link, link: body.link })
      .returning(imageSelect)
    return inserted ?? null
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
}
