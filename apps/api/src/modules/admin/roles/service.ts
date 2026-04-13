import { db } from '../../../db';
import { roles, rolePermissions, permissions } from '../../../db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import type { AdminRolesModel } from './model';

export abstract class AdminRolesService {
  static async list() {
    const rows = await db
      .select({
        roleId: roles.roleId,
        name: roles.name,
        description: roles.description,
        priority: roles.priority,
        isDefault: roles.isDefault,
        createdAt: roles.createdAt,
        permissions: sql<string[]>`
          coalesce(
            array_agg(${permissions.name}),
            array[]::text[]
          )
        `,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(roles.roleId, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.permissionId))
      .where(isNull(roles.deletedAt))
      .groupBy(roles.roleId)
      .orderBy(desc(roles.priority));

    return rows;
  }

  static async listPermissions() {
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
      // Insert role at priority 0
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

      // Assign permissions
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

  static async update(id: string, body: AdminRolesModel['updateBody']) {
    return db.transaction(async (tx) => {
      const [role] = await tx
        .update(roles)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
        })
        .where(and(eq(roles.roleId, id), isNull(roles.deletedAt)))
        .returning({
          roleId: roles.roleId,
          name: roles.name,
          description: roles.description,
          priority: roles.priority,
          isDefault: roles.isDefault,
          createdAt: roles.createdAt,
        });

      if (!role) {
        return null;
      }

      // Update permissions if provided
      if (body.permissionIds !== undefined) {
        await tx
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, id));

        if (body.permissionIds.length > 0) {
          await tx.insert(rolePermissions).values(
            body.permissionIds.map(permissionId => ({
              roleId: id,
              permissionId,
            }))
          );
        }
      }

      return role;
    });
  }

  static async delete(id: string) {
    const [role] = await db
      .update(roles)
      .set({ deletedAt: new Date() })
      .where(and(eq(roles.roleId, id), isNull(roles.deletedAt)))
      .returning({ roleId: roles.roleId });

    return role ? true : null;
  }

  static async reorder(roleId: string, newPriority: number, maxEditablePriority: number) {
    return db.transaction(async (tx) => {
      // Get current priority
      const [role] = await tx
        .select({ priority: roles.priority })
        .from(roles)
        .where(eq(roles.roleId, roleId))
        .limit(1);

      if (!role || role.priority > maxEditablePriority || newPriority > maxEditablePriority) {
        return false;
      }

      const oldPriority = role.priority;

      // Adjust priorities of affected roles
      if (newPriority > oldPriority) {
        // Moving UP: decrement roles between old+1 and new
        await tx
          .update(roles)
          .set({ priority: sql`${roles.priority} - 1` })
          .where(and(
            sql`${roles.priority} > ${oldPriority}`,
            sql`${roles.priority} <= ${newPriority}`,
            isNull(roles.deletedAt)
          ));
      } else {
        // Moving DOWN: increment roles between new and old-1
        await tx
          .update(roles)
          .set({ priority: sql`${roles.priority} + 1` })
          .where(and(
            sql`${roles.priority} >= ${newPriority}`,
            sql`${roles.priority} < ${oldPriority}`,
            isNull(roles.deletedAt)
          ));
      }

      // Set moved role to new priority
      await tx
        .update(roles)
        .set({ priority: newPriority })
        .where(eq(roles.roleId, roleId));

      return true;
    });
  }

  static async setDefault(roleId: string) {
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

      return role ? true : null;
    });
  }
}
