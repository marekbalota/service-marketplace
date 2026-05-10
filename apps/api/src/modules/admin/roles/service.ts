import { db } from '../../../db'
import { roles, rolePermissions, permissions, users } from '../../../db/schema'
import { eq, and, isNull, sql, desc } from 'drizzle-orm'
import type { AdminRolesModel } from './model'
import { RBACService } from '../../../lib/rbac/rbac-helper'
import {
  ForbiddenError,
  NotFoundError,
  AuthErrorMessages,
  ErrorMessages,
} from '../../../lib/errors'

export abstract class AdminRolesService {
  static async getAllRoles() {
    return db
      .select({
        roleId: roles.roleId,
        name: roles.name,
        description: roles.description,
        priority: roles.priority,
        isDefault: roles.isDefault,
        createdAt: roles.createdAt,
        userCount: sql<number>`count(distinct ${users.id})::int`,
        permissions: sql<string[]>`
          coalesce(
            json_agg(distinct ${rolePermissions.permissionId})
              filter (where ${rolePermissions.permissionId} is not null),
            '[]'::json
          )
        `,
      })
      .from(roles)
      .leftJoin(users, eq(roles.roleId, users.roleId))
      .leftJoin(rolePermissions, eq(roles.roleId, rolePermissions.roleId))
      .where(isNull(roles.deletedAt))
      .groupBy(roles.roleId)
      .orderBy(desc(roles.priority))
  }

  static async getAllPermissions() {
    return db
      .select({
        permissionId: permissions.permissionId,
        name: permissions.name,
        description: permissions.description,
      })
      .from(permissions)
      .where(isNull(permissions.deletedAt))
      .orderBy(permissions.name)
  }

  static async create(requesterRoleId: string, body: AdminRolesModel['createBody']) {
    // Check that requester has all permissions they're trying to assign
    if (body.permissionIds.length > 0) {
      const requesterPermissions = await RBACService.getRolePermissions(requesterRoleId)
      const unavailablePermissions = body.permissionIds.filter(
        (p) => !requesterPermissions.includes(p),
      )
      if (unavailablePermissions.length > 0) {
        throw new ForbiddenError(AuthErrorMessages.cannotAssignPermissions)
      }
    }

    return db.transaction(async (tx) => {
      // Increment all existing roles' priority by 1
      await tx
        .update(roles)
        .set({ priority: sql`${roles.priority} + 1` })
        .where(isNull(roles.deletedAt))

      // Create new role with priority 0 (lowest priority)
      const [role] = await tx
        .insert(roles)
        .values({
          name: body.name,
          description: body.description ?? null,
          priority: 0,
          isDefault: false,
        })
        .returning({
          roleId: roles.roleId,
          name: roles.name,
          description: roles.description,
          priority: roles.priority,
          isDefault: roles.isDefault,
          createdAt: roles.createdAt,
        })

      if (body.permissionIds.length > 0) {
        await tx.insert(rolePermissions).values(
          body.permissionIds.map((permissionId) => ({
            roleId: role!.roleId,
            permissionId,
          })),
        )
      }

      return role!
    })
  }

  static async update(
    requesterRoleId: string,
    roleId: string,
    body: AdminRolesModel['updateBody'],
  ) {
    // First check if role exists
    const targetRole = await db.query.roles.findFirst({
      where: and(eq(roles.roleId, roleId), isNull(roles.deletedAt)),
    })

    if (!targetRole) {
      throw new NotFoundError(ErrorMessages.roleNotFound)
    }

    const canManage = await RBACService.canManageRole(requesterRoleId, roleId)
    if (!canManage) {
      throw new ForbiddenError(AuthErrorMessages.cannotModifySameOrHigherPriorityRole)
    }

    // Check that requester has all permissions they're trying to assign
    if (body.permissionIds !== undefined && body.permissionIds.length > 0) {
      const requesterPermissions = await RBACService.getRolePermissions(requesterRoleId)
      const unavailablePermissions = body.permissionIds.filter(
        (p) => !requesterPermissions.includes(p),
      )
      if (unavailablePermissions.length > 0) {
        throw new ForbiddenError(AuthErrorMessages.cannotAssignPermissions)
      }
    }

    return db.transaction(async (tx) => {
      const [role] = await tx
        .update(roles)
        .set({
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
        })
        .where(and(eq(roles.roleId, roleId), isNull(roles.deletedAt)))
        .returning({
          roleId: roles.roleId,
          name: roles.name,
          description: roles.description,
          priority: roles.priority,
          isDefault: roles.isDefault,
          createdAt: roles.createdAt,
        })

      if (!role) {
        throw new NotFoundError(ErrorMessages.roleNotFound)
      }

      // Update permissions if provided
      if (body.permissionIds !== undefined) {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))

        if (body.permissionIds.length > 0) {
          await tx.insert(rolePermissions).values(
            body.permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          )
        }
      }

      return role
    })
  }

  static async delete(requesterRoleId: string, roleId: string) {
    // First check if role exists
    const targetRole = await db.query.roles.findFirst({
      where: and(eq(roles.roleId, roleId), isNull(roles.deletedAt)),
    })

    if (!targetRole) {
      throw new NotFoundError(ErrorMessages.roleNotFound)
    }

    const canManage = await RBACService.canManageRole(requesterRoleId, roleId)
    if (!canManage) {
      throw new ForbiddenError(AuthErrorMessages.cannotDeleteSameOrHigherPriorityRole)
    }

    return db.transaction(async (tx) => {
      // Check if role is default
      const role = await tx.query.roles.findFirst({
        where: eq(roles.roleId, roleId),
      })

      if (!role) {
        throw new NotFoundError(ErrorMessages.roleNotFound)
      }

      if (role.isDefault) {
        throw new ForbiddenError(ErrorMessages.cannotDeleteDefaultRole)
      }

      const deletedPriority = role.priority

      // Get the default role to assign to affected users
      const defaultRole = await tx.query.roles.findFirst({
        where: eq(roles.isDefault, true),
      })

      if (!defaultRole) {
        throw new ForbiddenError(ErrorMessages.noDefaultRoleFound)
      }

      // Update all users with this role to the default role
      await tx.update(users).set({ roleId: defaultRole.roleId }).where(eq(users.roleId, roleId))

      // Soft delete the role
      const [updated] = await tx
        .update(roles)
        .set({ deletedAt: new Date() })
        .where(and(eq(roles.roleId, roleId), isNull(roles.deletedAt)))
        .returning({ roleId: roles.roleId })

      if (!updated) {
        throw new NotFoundError(ErrorMessages.roleNotFound)
      }

      // Decrement priority of all roles that were above the deleted one
      await tx
        .update(roles)
        .set({ priority: sql`${roles.priority} - 1` })
        .where(and(isNull(roles.deletedAt), sql`${roles.priority} > ${deletedPriority}`))

      return true
    })
  }

  static async reorder(requesterRoleId: string, roleId: string, newPriority: number) {
    const requesterPriority = await RBACService.getRolePriority(requesterRoleId)
    if (requesterPriority === null) {
      throw new ForbiddenError(AuthErrorMessages.forbidden)
    }

    const maxEditablePriority = requesterPriority - 1

    return db.transaction(async (tx) => {
      const [role] = await tx
        .select({ priority: roles.priority })
        .from(roles)
        .where(eq(roles.roleId, roleId))
        .limit(1)

      if (!role || role.priority > maxEditablePriority || newPriority > maxEditablePriority) {
        throw new ForbiddenError(AuthErrorMessages.invalidReorderOperation)
      }

      const oldPriority = role.priority

      if (newPriority > oldPriority) {
        await tx
          .update(roles)
          .set({ priority: sql`${roles.priority} - 1` })
          .where(
            and(
              sql`${roles.priority} > ${oldPriority}`,
              sql`${roles.priority} <= ${newPriority}`,
              isNull(roles.deletedAt),
            ),
          )
      } else {
        await tx
          .update(roles)
          .set({ priority: sql`${roles.priority} + 1` })
          .where(
            and(
              sql`${roles.priority} >= ${newPriority}`,
              sql`${roles.priority} < ${oldPriority}`,
              isNull(roles.deletedAt),
            ),
          )
      }

      await tx.update(roles).set({ priority: newPriority }).where(eq(roles.roleId, roleId))

      return true
    })
  }

  static async setDefault(requesterRoleId: string, roleId: string) {
    const canManage = await RBACService.canManageRole(requesterRoleId, roleId)
    if (!canManage) {
      throw new ForbiddenError(AuthErrorMessages.cannotSetSameOrHigherAsDefault)
    }

    return db.transaction(async (tx) => {
      // Unset current default
      await tx.update(roles).set({ isDefault: false }).where(eq(roles.isDefault, true))

      // Set new default
      const [role] = await tx
        .update(roles)
        .set({ isDefault: true })
        .where(and(eq(roles.roleId, roleId), isNull(roles.deletedAt)))
        .returning({ roleId: roles.roleId })

      if (!role) {
        throw new NotFoundError(ErrorMessages.roleNotFound)
      }

      return true
    })
  }

  static async listAssignableRoles(requesterRoleId: string) {
    const requesterPriority = await RBACService.getRolePriority(requesterRoleId)
    if (requesterPriority === null) {
      throw new ForbiddenError(AuthErrorMessages.forbidden)
    }

    return db
      .select({
        roleId: roles.roleId,
        name: roles.name,
      })
      .from(roles)
      .where(and(sql`${roles.priority} < ${requesterPriority}`, isNull(roles.deletedAt)))
      .orderBy(desc(roles.priority))
  }
}
