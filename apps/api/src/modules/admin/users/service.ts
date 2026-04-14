import { db } from '../../../db';
import { users, roles, sessions } from '../../../db/schema';
import { eq, and, isNull, ilike, or, desc, count, sql } from 'drizzle-orm';
import type { AdminUsersModel } from './model';
import { RBACService } from '../../../lib/rbac/rbac-helper';
import { ForbiddenError, NotFoundError, AuthErrorMessages, ErrorMessages } from '../../../lib/errors';

export abstract class AdminUsersService {
  static async findAll(query: AdminUsersModel['usersQuery']) {
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

    return db.transaction(async (tx) => {
      const [countRow] = await tx
        .select({ total: count() })
        .from(users)
        .where(conditions);

      const total = countRow?.total ?? 0;

      const rows = await tx
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          roleId: users.roleId,
          roleName: roles.name,
          rolePriority: roles.priority,
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

      const items = rows.map(({ roleId, roleName, rolePriority, ...rest }) => ({
        ...rest,
        role: roleId && roleName && rolePriority !== null
          ? { roleId, name: roleName, priority: rolePriority }
          : null,
      }));

      return {
        items,
        total,
        totalPages: size ? Math.ceil(total / size) : 1,
      };
    });
  }

  static async ban(requesterRoleId: string, targetUserId: string, reason: string, expiresAt?: Date) {
    // Verify not trying to ban self
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      with: { role: true },
    });

    if (!targetUser) {
      throw new NotFoundError(ErrorMessages.userNotFound);
    }

    if (!targetUser.role) {
      throw new NotFoundError(ErrorMessages.userRoleNotFound);
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
      // Get the default role to assign to banned user
      const defaultRole = await tx.query.roles.findFirst({
        where: eq(roles.isDefault, true),
      });

      if (!defaultRole) {
        throw new ForbiddenError(ErrorMessages.noDefaultRoleFound);
      }

      // Set ban status and assign default role in one query
      const [user] = await tx
        .update(users)
        .set({
          isBanned: true,
          banReason: reason,
          banExpiration: expiresAt ?? null,
          roleId: defaultRole.roleId,
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

    if (!targetUser) {
      throw new NotFoundError(ErrorMessages.userNotFound);
    }

    if (!targetUser.role) {
      throw new NotFoundError(ErrorMessages.userRoleNotFound);
    }

    // Priority check
    const canManage = await RBACService.canManageRole(requesterRoleId, targetUser.role.roleId);
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

    if (!targetUser) {
      throw new NotFoundError(ErrorMessages.userNotFound);
    }

    if (!targetUser.role) {
      throw new NotFoundError(ErrorMessages.userRoleNotFound);
    }

    // Cannot modify users with equal or higher priority
    const canManageTarget = await RBACService.canManageRole(requesterRoleId, targetUser.role.roleId);
    if (!canManageTarget) {
      throw new ForbiddenError(AuthErrorMessages.cannotModifySameOrHigherRole);
    }

    // Cannot assign roles with equal or higher priority
    const canManageNewRole = await RBACService.canManageRole(requesterRoleId, newRoleId);
    if (!canManageNewRole) {
      throw new ForbiddenError(AuthErrorMessages.cannotAssignSameOrHigherRole);
    }

    const [user] = await db
      .update(users)
      .set({ roleId: newRoleId })
      .where(eq(users.id, targetUserId))
      .returning({ userId: users.id });

    return user ? true : null;
  }

  static async listAssignableRoles(requesterRoleId: string) {
    const requesterPriority = await RBACService.getRolePriority(requesterRoleId);
    if (requesterPriority === null) {
      throw new ForbiddenError(AuthErrorMessages.forbidden);
    }

    return db
      .select({
        roleId: roles.roleId,
        name: roles.name,
      })
      .from(roles)
      .where(and(
        sql`${roles.priority} < ${requesterPriority}`,
        isNull(roles.deletedAt)
      ))
      .orderBy(desc(roles.priority));
  }
}
