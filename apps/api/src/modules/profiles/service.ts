import { db } from '../../db'
import { userProfiles, users, roles } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import type { ProfilesModel } from './model'

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
      .innerJoin(roles, eq(users.roleId, roles.roleId))
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .limit(1)

    return row ?? null
  }

  static async findByAccountId(accountId: string) {
    return db
      .select(profileSelect)
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.accountId, users.id))
      .innerJoin(roles, eq(users.roleId, roles.roleId))
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

  static async update(id: string, body: ProfilesModel['updateBody']) {
    const [updated] = await db
      .update(userProfiles)
      .set(body)
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .returning({ userProfileId: userProfiles.userProfileId })

    return updated ?? null
  }
}
