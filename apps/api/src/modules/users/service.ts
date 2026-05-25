import { db } from '../../db'
import { userProfiles, users, roles, rolePermissions, permissions } from '../../db/schema'
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
          }[]
        >`
          coalesce(
            (select json_agg(json_build_object(
              'userProfileId', ${userProfiles.userProfileId},
              'name', ${userProfiles.name},
              'email', ${userProfiles.email},
              'bio', ${userProfiles.bio},
              'phoneNumber', ${userProfiles.phoneNumber},
              'fax', ${userProfiles.fax},
              'createdAt', ${userProfiles.createdAt},
              'updatedAt', ${userProfiles.updatedAt}
            ))
            from ${userProfiles}
            where ${userProfiles.accountId} = ${users.id}
              and ${userProfiles.deletedAt} is null),
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
}
