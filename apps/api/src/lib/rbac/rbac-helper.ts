import { db } from '../../db';
import { users, roles, rolePermissions, permissions } from '../../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export abstract class RBACService {
  static async getUserPermissions(userId: string): Promise<string[]> {
    const result = await db
      .select({ permissionName: permissions.name })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.roleId))
      .innerJoin(rolePermissions, eq(roles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.permissionId))
      .where(and(
        eq(users.id, userId),
        isNull(roles.deletedAt)
      ));

    return result.map(r => r.permissionName);
  }

  static async canManageRole(
    requesterRoleId: string,
    targetRoleId: string
  ): Promise<boolean> {
    const [requesterRole, targetRole] = await Promise.all([
      db.query.roles.findFirst({ where: eq(roles.roleId, requesterRoleId) }),
      db.query.roles.findFirst({ where: eq(roles.roleId, targetRoleId) }),
    ]);

    if (!requesterRole || !targetRole) {
      return false;
    }

    return targetRole.priority < requesterRole.priority;
  }

  static async getRolePriority(roleId: string): Promise<number | null> {
    const role = await db.query.roles.findFirst({
      where: eq(roles.roleId, roleId),
    });
    return role?.priority ?? null;
  }

  static async getRolePermissions(roleId: string): Promise<string[]> {
    const result = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .innerJoin(roles, eq(rolePermissions.roleId, roles.roleId))
      .where(and(
        eq(rolePermissions.roleId, roleId),
        isNull(roles.deletedAt)
      ));

    return result.map(r => r.permissionId);
  }
}
