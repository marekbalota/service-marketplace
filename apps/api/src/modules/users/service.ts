import { db } from '../../db'
import { users, roles, rolePermissions, permissions } from '../../db/schema'
import { eq, sql } from 'drizzle-orm'
import type { UsersModel } from './model'
import { NotFoundError, ErrorMessages } from '../../lib/errors'

export abstract class UsersService {
  static async getCurrentUser(
    userId: string,
  ): Promise<Omit<UsersModel['meResponse'], 'impersonatedBy' | 'sessionId'>> {
    const [row] = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        notifyMessages: users.notifyMessages,
        notifyReviews: users.notifyReviews,
        role: sql<{
          roleId: string
          name: string
          priority: number
          permissions: string[]
        } | null>`
          case
            when ${users.roleId} is null then null
            else json_build_object(
              'roleId', ${roles.roleId},
              'name', ${roles.name},
              'priority', ${roles.priority},
              'permissions', coalesce(
                (select json_agg(${permissions.name})
                 from ${rolePermissions}
                 join ${permissions} on ${rolePermissions.permissionId} = ${permissions.permissionId}
                 where ${rolePermissions.roleId} = ${users.roleId}),
                '[]'::json
              )
            )::json
          end
        `,
        profiles: sql<
          {
            userProfileId: string
            name: string
            email: string
            bio: string | null
            phoneNumber: string | null
            fax: string | null
            createdAt: Date
            updatedAt: Date | null
            profileImageUrl: string | null
          }[]
        >`
          coalesce(
            (select json_agg(json_build_object(
              'userProfileId', up.user_profile_id,
              'name', up.name,
              'email', up.email,
              'bio', up.bio,
              'phoneNumber', up.phone_number,
              'fax', up.fax,
              'createdAt', up.created_at,
              'updatedAt', up.updated_at,
              'profileImageUrl', (
                select i.link from images i
                where i.image_id = up.profile_image_id
                  and i.deleted_at is null
                limit 1
              )
            ))
            from user_profiles up
            where up.account_id = ${users.id}
              and up.deleted_at is null),
            '[]'::json
          )
        `,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.roleId))
      .where(eq(users.id, userId))
      .limit(1)

    if (!row) {
      throw new NotFoundError(ErrorMessages.userNotFound)
    }

    return row
  }

  static async updateNotificationPreferences(
    userId: string,
    prefs: UsersModel['updateNotificationsBody'],
  ): Promise<void> {
    if (prefs.notifyMessages === undefined && prefs.notifyReviews === undefined) return
    await db.update(users).set(prefs).where(eq(users.id, userId))
  }
}
