import { db } from '../../db'
import { userProfiles, users, roles } from '../../db/schema'
import { and, count, eq, isNull } from 'drizzle-orm'
import type { ProfilesModel } from './model'
import { NotFoundError, ForbiddenError, ErrorMessages, AuthErrorMessages } from '../../lib/errors'

const profileSelect = {
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
  roleName:      roles.name,
}

export abstract class ProfilesService {
  static async findById(id: string) {
    const [row] = await db
      .select(profileSelect)
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.accountId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.roleId))
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .limit(1)

    if (!row) throw new NotFoundError(ErrorMessages.profileNotFound)
    return row
  }

  static async findByAccountId(accountId: string) {
    return db
      .select(profileSelect)
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.accountId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.roleId))
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
      .returning({ userProfileId: userProfiles.userProfileId })

    if (!updated) throw new NotFoundError(ErrorMessages.profileNotFound)
    return ProfilesService.findById(updated.userProfileId)
  }

  static async updateWithOwnershipCheck(accountId: string, id: string, body: ProfilesModel['updateBody']) {
    const isOwner = await this.isProfileOwnedByAccount(id, accountId)
    if (!isOwner) throw new ForbiddenError(AuthErrorMessages.forbidden)
    return this.update(id, body)
  }

  static async create(body: ProfilesModel['createBody'] & { accountId: string }) {
    const [inserted] = await db
      .insert(userProfiles)
      .values({
        accountId:   body.accountId,
        name:        body.name,
        email:       body.email,
        bio:         body.bio ?? null,
        phoneNumber: body.phoneNumber ?? null,
        fax:         body.fax ?? null,
      })
      .returning({ userProfileId: userProfiles.userProfileId })

    if (!inserted) return null
    return ProfilesService.findById(inserted.userProfileId)
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
}
