import { db } from '../../../db';
import { users, roles, sessions } from '../../../db/schema';
import { eq, and, isNull, ilike, or, desc, count, sql } from 'drizzle-orm';
import type { AdminUsersModel } from './model';

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

  static async ban(userId: string, reason: string, expiresAt?: Date) {
    return await db.transaction(async (tx) => {
      // Set ban status
      const [user] = await tx
        .update(users)
        .set({
          isBanned: true,
          banReason: reason,
          banExpiration: expiresAt ?? null,
        })
        .where(eq(users.id, userId))
        .returning({ userId: users.id });

      if (!user) {
        return null;
      }

      // Delete all sessions to immediately kick out the user
      await tx.delete(sessions).where(eq(sessions.userId, userId));

      return true;
    });
  }

  static async unban(userId: string) {
    const [user] = await db
      .update(users)
      .set({
        isBanned: false,
        banReason: null,
        banExpiration: null,
      })
      .where(eq(users.id, userId))
      .returning({ userId: users.id });

    return user ? true : null;
  }

  static async assignRole(userId: string, roleId: string) {
    const [user] = await db
      .update(users)
      .set({ roleId })
      .where(eq(users.id, userId))
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
