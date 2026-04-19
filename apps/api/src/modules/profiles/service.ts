import { db } from '../../db'
import { userProfiles, users } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
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
  accountName:   users.name,
}

export abstract class ProfilesService {
  static async findById(id: string) {
    const [row] = await db
      .select(profileSelect)
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.accountId, users.id))
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .limit(1)

    if (!row) {
      throw new NotFoundError(ErrorMessages.profileNotFound);
    }

    return row;
  }

  static async findByAccountId(accountId: string) {
    return db
      .select(profileSelect)
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
    const profiles = await db
      .select({ userProfileId: userProfiles.userProfileId })
      .from(userProfiles)
      .where(and(
        eq(userProfiles.accountId, accountId),
        isNull(userProfiles.deletedAt)
      ));
    return profiles.map(p => p.userProfileId);
  }

  static async update(id: string, body: ProfilesModel['updateBody']) {
    const [updated] = await db
      .update(userProfiles)
      .set(body)
      .where(and(eq(userProfiles.userProfileId, id), isNull(userProfiles.deletedAt)))
      .returning({ userProfileId: userProfiles.userProfileId })

    if (!updated) {
      throw new NotFoundError(ErrorMessages.profileNotFound);
    }

    return updated;
  }

  static async updateWithOwnershipCheck(
    accountId: string,
    id: string,
    body: ProfilesModel['updateBody']
  ) {
    // Verify ownership
    const isOwner = await this.isProfileOwnedByAccount(id, accountId);
    if (!isOwner) {
      throw new ForbiddenError(AuthErrorMessages.forbidden);
    }

    return this.update(id, body);
  }
}
