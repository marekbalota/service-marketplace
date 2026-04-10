import { db } from '../../db'
import { userProfiles, accounts, roles } from '../../db/schema'
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
  accountName:   accounts.name,
  roleName:      roles.name,
}

const activeWhere = and(isNull(userProfiles.deletedAt), isNull(accounts.deletedAt))

export abstract class ProfilesService {
  static async findAll() {
    return db
      .select(profileSelect)
      .from(userProfiles)
      .innerJoin(accounts, eq(userProfiles.accountId, accounts.accountId))
      .innerJoin(roles, eq(accounts.roleId, roles.roleId))
      .where(activeWhere)
  }

  static async findById(id: string) {
    const [row] = await db
      .select(profileSelect)
      .from(userProfiles)
      .innerJoin(accounts, eq(userProfiles.accountId, accounts.accountId))
      .innerJoin(roles, eq(accounts.roleId, roles.roleId))
      .where(and(eq(userProfiles.userProfileId, id), activeWhere))
      .limit(1)

    return row ?? null
  }

  static async update(id: string, body: ProfilesModel['updateBody']) {
    const [updated] = await db
      .update(userProfiles)
      .set(body)
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .returning()

    return updated ?? null
  }
}
