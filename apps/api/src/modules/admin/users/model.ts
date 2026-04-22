import { t, type UnwrapSchema } from 'elysia';

const roleInfo = t.Object({
  roleId: t.String(),
  name: t.String(),
  priority: t.Number(),
});

const userRow = t.Object({
  userId: t.String(),
  name: t.String(),
  email: t.String(),
  role: t.Nullable(roleInfo),
  isBanned: t.Boolean(),
  banReason: t.Nullable(t.String()),
  banExpiration: t.Nullable(t.Date()),
  createdAt: t.Date(),
});

export const AdminUsersModel = {
  // List users
  usersQuery: t.Object({
    search: t.Optional(t.String()),
    sort: t.Optional(t.Union([
      t.Literal('name'),
      t.Literal('email'),
      t.Literal('created'),
    ])),
    role: t.Optional(t.String()),
    isBanned: t.Optional(t.Boolean()),
    offset: t.Optional(t.Numeric()),
    size: t.Optional(t.Numeric()),
  }),
  usersResponse: t.Object({
    items: t.Array(userRow),
    total: t.Number(),
    totalBanned: t.Number(),
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

  // Get single user
  findByIdParams: t.Object({ id: t.String() }),
  findByIdResponse: userRow,

  // List profiles for a user
  userProfilesParams: t.Object({ id: t.String() }),
  userProfilesResponse: t.Array(t.Object({
    userProfileId: t.String(),
    accountId: t.String(),
    name: t.String(),
    email: t.String(),
    bio: t.Nullable(t.String()),
    phoneNumber: t.Nullable(t.String()),
    fax: t.Nullable(t.String()),
    createdAt: t.Date(),
  })),
} as const;

export type AdminUsersModel = {
  [k in keyof typeof AdminUsersModel]: UnwrapSchema<typeof AdminUsersModel[k]>;
};
