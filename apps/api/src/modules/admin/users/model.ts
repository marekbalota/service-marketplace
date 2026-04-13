import { t, type UnwrapSchema } from 'elysia';

const userRow = t.Object({
  userId: t.String(),
  name: t.String(),
  email: t.String(),
  roleId: t.Nullable(t.String()),
  roleName: t.String(),
  isBanned: t.Boolean(),
  banReason: t.Nullable(t.String()),
  banExpiration: t.Nullable(t.Date()),
  createdAt: t.Date(),
});

export const AdminUsersModel = {
  // List users
  listQuery: t.Object({
    search: t.Optional(t.String()),
    sort: t.Optional(t.Union([
      t.Literal('name'),
      t.Literal('email'),
      t.Literal('created'),
    ])),
    offset: t.Optional(t.Numeric()),
    size: t.Optional(t.Numeric()),
  }),
  listResponse: t.Object({
    items: t.Array(userRow),
    total: t.Number(),
    totalPages: t.Number(),
  }),

  // Ban user
  banParams: t.Object({ id: t.String() }),
  banBody: t.Object({
    reason: t.String({ minLength: 1 }),
    expiresAt: t.Optional(t.Date()),
  }),

  // Unban user
  unbanParams: t.Object({ id: t.String() }),

  // Assign role
  assignRoleParams: t.Object({ id: t.String() }),
  assignRoleBody: t.Object({
    roleId: t.String(),
  }),

  // List roles for assignment
  assignableRoleResponse: t.Array(t.Object({
    roleId: t.String(),
    name: t.String(),
  })),
} as const;

export type AdminUsersModel = {
  [k in keyof typeof AdminUsersModel]: UnwrapSchema<typeof AdminUsersModel[k]>;
};
