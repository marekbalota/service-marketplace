import { db } from '../../db'
import { userProfiles, users } from '../../db/schema'
import { and, count, eq, isNull, sql } from 'drizzle-orm'
import type { ProfilesModel } from './model'
import { NotFoundError, ForbiddenError, ConflictError, ErrorMessages, AuthErrorMessages } from '../../lib/errors'

const profileSelect = {
  userProfileId: userProfiles.userProfileId,
  name:          userProfiles.name,
  email:         userProfiles.email,
  bio:           userProfiles.bio,
  phoneNumber:   userProfiles.phoneNumber,
  fax:           userProfiles.fax,
  createdAt:     userProfiles.createdAt,
  updatedAt:     userProfiles.updatedAt,
}

export abstract class ProfilesService {
  static async findById(id: string) {
    const [row] = await db
      .select({
        ...profileSelect,
        averageRating: sql<number | null>`(
          SELECT AVG(r.rating)::float8
          FROM reviews r
          INNER JOIN posts p ON r.post_id = p.post_id
          WHERE p.author_id = ${userProfiles.userProfileId}
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
        )`,
      })
      .from(userProfiles)
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundError(ErrorMessages.profileNotFound)
    return row
  }

  static async findByAccountId(accountId: string) {
    return db
      .select({
        userProfileId: userProfiles.userProfileId,
        accountId:     userProfiles.accountId,
        name:          userProfiles.name,
        email:         userProfiles.email,
        bio:           userProfiles.bio,
        phoneNumber:   userProfiles.phoneNumber,
        fax:           userProfiles.fax,
        createdAt:     userProfiles.createdAt,
        updatedAt:     userProfiles.updatedAt,
        accountName:   users.name,
      })
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.accountId, users.id))
      .where(and(eq(userProfiles.accountId, accountId), isNull(userProfiles.deletedAt)))
  }

  static async isProfileOwnedByAccount(profileId: string, accountId: string) {
    const [row] = await db
      .select({ userProfileId: userProfiles.userProfileId })
      .from(userProfiles)
      .where(and(eq(userProfiles.userProfileId, profileId), eq(userProfiles.accountId, accountId), isNull(userProfiles.deletedAt)))
      .limit(1)

    return row !== undefined
  }

  static async getProfileIdsByAccount(accountId: string): Promise<string[]> {
    const rows = await db
      .select({ userProfileId: userProfiles.userProfileId })
      .from(userProfiles)
      .where(and(eq(userProfiles.accountId, accountId), isNull(userProfiles.deletedAt)))
    return rows.map(p => p.userProfileId)
  }

  static async update(id: string, body: ProfilesModel['updateBody']) {
    const [updated] = await db
      .update(userProfiles)
      .set(body)
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .returning(profileSelect)

    if (!updated) throw new NotFoundError(ErrorMessages.profileNotFound)
    return updated
  }

  static async updateWithOwnershipCheck(accountId: string, id: string, body: ProfilesModel['updateBody']) {
    const isOwner = await this.isProfileOwnedByAccount(id, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)
    return this.update(id, body)
  }

  static async create(accountId: string, body: ProfilesModel['createBody']) {
    const [inserted] = await db
      .insert(userProfiles)
      .values({
        accountId,
        name:        body.name,
        email:       body.email,
        bio:         body.bio ?? null,
        phoneNumber: body.phoneNumber ?? null,
        fax:         body.fax ?? null,
      })
      .returning(profileSelect)

    return inserted ?? null
  }

  static async countActiveByAccountId(accountId: string) {
    const [row] = await db
      .select({ total: count() })
      .from(userProfiles)
      .where(and(eq(userProfiles.accountId, accountId), isNull(userProfiles.deletedAt)))

    return row?.total ?? 0
  }

  static async delete(id: string) {
    const [deleted] = await db
      .update(userProfiles)
      .set({ deletedAt: new Date() })
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .returning({ userProfileId: userProfiles.userProfileId })

    return deleted ?? null
  }

  static async deleteWithOwnershipCheck(profileId: string, accountId: string) {
    const isOwner = await this.isProfileOwnedByAccount(profileId, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)

    const activeCount = await this.countActiveByAccountId(accountId)
    if (activeCount <= 1) throw new ConflictError(ErrorMessages.cannotDeleteLastProfile)

    await this.delete(profileId)
  }
}
