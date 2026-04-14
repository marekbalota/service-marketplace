import { db } from '../../../db';
import { users, roles, sessions } from '../../../db/schema';
import { eq, and, isNull, ilike, or, desc, count, sql } from 'drizzle-orm';
import type { AdminUsersModel } from './model';
import { RBACService } from '../../../lib/rbac/rbac-helper';
import { ForbiddenError, NotFoundError, AuthErrorMessages } from '../../../lib/errors';

export abstract class AdminUsersService {
  static async list(query: AdminUsersModel['listQuery']) {
    const { search, sort, offset = 0, size } = query;

    const sortColumn =
      sort === 'name' ? users.name :
      sort === 'email' ? users.email :
      users.createdAt;

    const conditions = and(
      search
        ? or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`),
          )
        : undefined,
    );

    const [countRow] = await db
      .select({ total: count() })
      .from(users)
      .where(conditions);

    const total = countRow?.total ?? 0;

    const rows = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        roleName: sql<string>`coalesce(${roles.name}, 'No Role')`,
        isBanned: users.isBanned,
        banReason: users.banReason,
        banExpiration: users.banExpiration,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.roleId))
      .where(conditions)
      .orderBy(desc(sortColumn))
      .offset(offset)
      .limit(size ?? 20);

    return {
      items: rows,
      total,
      totalPages: size ? Math.ceil(total / size) : 1,
    };
  }

  static async ban(requesterRoleId: string, targetUserId: string, reason: string, expiresAt?: Date) {
    // Verify not trying to ban self
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      with: { role: true },
    });

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    if (!targetUser.role) {
      throw new NotFoundError('User role not found');
    }

    // Priority check - can only ban users with lower priority
    const canManage = await RBACService.canManageRole(
      requesterRoleId,
      targetUser.role.roleId
    );

    if (!canManage) {
      throw new ForbiddenError(AuthErrorMessages.cannotManageRole);
    }

    return await db.transaction(async (tx) => {
      // Set ban status
      const [user] = await tx
        .update(users)
        .set({
          isBanned: true,
          banReason: reason,
          banExpiration: expiresAt ?? null,
        })
        .where(eq(users.id, targetUserId))
        .returning({ userId: users.id });

      if (!user) {
        return null;
      }

      // Delete all sessions to immediately kick out the user
      await tx.delete(sessions).where(eq(sessions.userId, targetUserId));

      return true;
    });
  }

  static async unban(requesterRoleId: string, targetUserId: string) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      with: { role: true },
    });

    if (!targetUser || !targetUser.role) {
      throw new NotFoundError('User not found');
    }

    // Priority check
    const canManage = await RBACService.canManageRole(
      requesterRoleId,
      targetUser.role.roleId
    );

    if (!canManage) {
      throw new ForbiddenError(AuthErrorMessages.cannotManageRole);
    }

    const [user] = await db
      .update(users)
      .set({
        isBanned: false,
        banReason: null,
        banExpiration: null,
      })
      .where(eq(users.id, targetUserId))
      .returning({ userId: users.id });

    return user ? true : null;
  }

  static async assignRole(requesterRoleId: string, targetUserId: string, newRoleId: string) {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      with: { role: true },
    });

    if (!targetUser || !targetUser.role) {
      throw new NotFoundError('User not found');
    }

    // Cannot modify users with equal or higher priority
    const canManageTarget = await RBACService.canManageRole(requesterRoleId, targetUser.role.roleId);
    if (!canManageTarget) {
      throw new ForbiddenError('Cannot modify users with equal or higher role');
    }

    // Cannot assign roles with equal or higher priority
    const canManageNewRole = await RBACService.canManageRole(requesterRoleId, newRoleId);
    if (!canManageNewRole) {
      throw new ForbiddenError('Cannot assign roles with equal or higher priority');
    }

    const [user] = await db
      .update(users)
      .set({ roleId: newRoleId })
      .where(eq(users.id, targetUserId))
      .returning({ userId: users.id });

    return user ? true : null;
  }

  static async listAssignableRoles(maxPriority: number) {
    return db
      .select({
        roleId: roles.roleId,
        name: roles.name,
      })
      .from(roles)
      .where(and(
        sql`${roles.priority} < ${maxPriority}`,
        isNull(roles.deletedAt)
      ))
      .orderBy(desc(roles.priority));
  }
}
