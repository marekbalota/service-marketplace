import { db } from '../../../db';
import { roles, rolePermissions, permissions, users } from '../../../db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import type { AdminRolesModel } from './model';
import { RBACService } from '../../../lib/rbac/rbac-helper';
import { ForbiddenError, NotFoundError } from '../../../lib/errors';

export abstract class AdminRolesService {
  static async getAllRoles() {
    return await db.transaction(async (tx) => {
      const roleRows = await tx
        .select({
          roleId: roles.roleId,
          name: roles.name,
          description: roles.description,
          priority: roles.priority,
          isDefault: roles.isDefault,
          createdAt: roles.createdAt,
          userCount: sql<number>`count(${users.id})::int`,
        })
        .from(roles)
        .leftJoin(users, eq(roles.roleId, users.roleId))
        .where(isNull(roles.deletedAt))
        .groupBy(roles.roleId)
        .orderBy(desc(roles.priority));

      const permissionRows = await tx
        .select({
          roleId: rolePermissions.roleId,
          permissionId: rolePermissions.permissionId,
        })
        .from(rolePermissions);

      const permissionsByRole = new Map<string, string[]>();
      for (const row of permissionRows) {
        const list = permissionsByRole.get(row.roleId) ?? [];
        list.push(row.permissionId);
        permissionsByRole.set(row.roleId, list);
      }

      return roleRows.map(role => ({
        ...role,
        permissions: permissionsByRole.get(role.roleId) ?? [],
      }));
    });
  }

  static async getAllPermissions() {
    return db
      .select({
        permissionId: permissions.permissionId,
        name: permissions.name,
        description: permissions.description,
      })
      .from(permissions)
      .orderBy(permissions.name);
  }

  static async create(body: AdminRolesModel['createBody']) {
    return db.transaction(async (tx) => {
      // Increment all existing roles' priority by 1
      await tx
        .update(roles)
        .set({ priority: sql`${roles.priority} + 1` })
        .where(isNull(roles.deletedAt));

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
        });

      if (body.permissionIds.length > 0) {
        await tx.insert(rolePermissions).values(
          body.permissionIds.map(permissionId => ({
            roleId: role!.roleId,
            permissionId,
          }))
        );
      }

      return role!;
    });
  }

  static async update(requesterRoleId: string, roleId: string, body: AdminRolesModel['updateBody']) {
    const canManage = await RBACService.canManageRole(requesterRoleId, roleId);
    if (!canManage) {
      throw new ForbiddenError('Cannot modify roles with equal or higher priority');
    }

    return db.transaction(async (tx) => {
      const [role] = await tx
        .update(roles)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.description && { description: body.description }),
        })
        .where(and(eq(roles.roleId, roleId), isNull(roles.deletedAt)))
        .returning({
          roleId: roles.roleId,
          name: roles.name,
          description: roles.description,
          priority: roles.priority,
          isDefault: roles.isDefault,
          createdAt: roles.createdAt,
        });

      if (!role) {
        throw new NotFoundError('Role not found');
      }

      // Update permissions if provided
      if (body.permissionIds !== undefined) {
        await tx
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, roleId));

        if (body.permissionIds.length > 0) {
          await tx.insert(rolePermissions).values(
            body.permissionIds.map(permissionId => ({
              roleId,
              permissionId,
            }))
          );
        }
      }

      return role;
    });
  }

  static async delete(requesterRoleId: string, roleId: string) {
    // Priority check
    const canManage = await RBACService.canManageRole(requesterRoleId, roleId);
    if (!canManage) {
      throw new ForbiddenError('Cannot delete roles with equal or higher priority');
    }

    return db.transaction(async (tx) => {
      // Check if role is default
      const role = await tx.query.roles.findFirst({
        where: eq(roles.roleId, roleId),
      });

      if (!role) {
        throw new NotFoundError('Role not found');
      }

      if (role.isDefault) {
        throw new ForbiddenError('Cannot delete the default role');
      }

      const deletedPriority = role.priority;

      // Get the default role to assign to affected users
      const defaultRole = await tx.query.roles.findFirst({
        where: eq(roles.isDefault, true),
      });

      if (!defaultRole) {
        throw new ForbiddenError('No default role found');
      }

      // Update all users with this role to the default role
      await tx
        .update(users)
        .set({ roleId: defaultRole.roleId })
        .where(eq(users.roleId, roleId));

      // Soft delete the role
      const [updated] = await tx
        .update(roles)
        .set({ deletedAt: new Date() })
        .where(and(eq(roles.roleId, roleId), isNull(roles.deletedAt)))
        .returning({ roleId: roles.roleId });

      if (!updated) {
        throw new NotFoundError('Role not found');
      }

      // Decrement priority of all roles that were below the deleted one
      await tx
        .update(roles)
        .set({ priority: sql`${roles.priority} - 1` })
        .where(and(
          isNull(roles.deletedAt),
          sql`${roles.priority} > ${deletedPriority}`
        ));

      return true;
    });
  }

  static async reorder(requesterRoleId: string, roleId: string, newPriority: number) {
    const requesterPriority = await RBACService.getRolePriority(requesterRoleId);
    if (requesterPriority === null) {
      throw new ForbiddenError('Forbidden');
    }

    const maxEditablePriority = requesterPriority - 1;

    return db.transaction(async (tx) => {
      const [role] = await tx
        .select({ priority: roles.priority })
        .from(roles)
        .where(eq(roles.roleId, roleId))
        .limit(1);

      if (!role || role.priority > maxEditablePriority || newPriority > maxEditablePriority) {
        throw new ForbiddenError('Invalid reorder operation');
      }

      const oldPriority = role.priority;

      if (newPriority > oldPriority) {
        await tx
          .update(roles)
          .set({ priority: sql`${roles.priority} - 1` })
          .where(and(
            sql`${roles.priority} > ${oldPriority}`,
            sql`${roles.priority} <= ${newPriority}`,
            isNull(roles.deletedAt)
          ));
      } else {
        await tx
          .update(roles)
          .set({ priority: sql`${roles.priority} + 1` })
          .where(and(
            sql`${roles.priority} >= ${newPriority}`,
            sql`${roles.priority} < ${oldPriority}`,
            isNull(roles.deletedAt)
          ));
      }

      await tx
        .update(roles)
        .set({ priority: newPriority })
        .where(eq(roles.roleId, roleId));

      return true;
    });
  }

  static async setDefault(requesterRoleId: string, roleId: string) {
    // Priority check - can only set roles below own priority as default
    const canManage = await RBACService.canManageRole(requesterRoleId, roleId);

    if (!canManage) {
      throw new ForbiddenError('Cannot set roles with equal or higher priority as default');
    }

    return db.transaction(async (tx) => {
      // Unset current default
      await tx
        .update(roles)
        .set({ isDefault: false })
        .where(eq(roles.isDefault, true));

      // Set new default
      const [role] = await tx
        .update(roles)
        .set({ isDefault: true })
        .where(and(eq(roles.roleId, roleId), isNull(roles.deletedAt)))
        .returning({ roleId: roles.roleId });

      if (!role) {
        throw new NotFoundError('Role not found');
      }

      return true;
    });
  }
}
