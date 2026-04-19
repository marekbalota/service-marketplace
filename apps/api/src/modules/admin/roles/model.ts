import { t, type UnwrapSchema } from 'elysia';

const roleRow = t.Object({
  roleId: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  priority: t.Number(),
  isDefault: t.Boolean(),
  createdAt: t.Date(),
});

const roleWithPermissions = t.Object({
  roleId: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  priority: t.Number(),
  isDefault: t.Boolean(),
  permissions: t.Array(t.String()),
  userCount: t.Number(),
  createdAt: t.Date(),
});

export const AdminRolesModel = {
  // List roles
  rolesResponse: t.Array(roleWithPermissions),

  // Create role
  createBody: t.Object({
    name: t.String({ minLength: 1 }),
    description: t.Optional(t.String()),
    permissionIds: t.Array(t.String()),
  }),
  createResponse: roleRow,

  // Update role
  updateParams: t.Object({ id: t.String() }),
  updateBody: t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
    description: t.Optional(t.String()),
    permissionIds: t.Optional(t.Array(t.String())),
  }),
  updateResponse: roleRow,

  // Delete role
  deleteParams: t.Object({ id: t.String() }),

  // Reorder roles
  reorderBody: t.Object({
    roleId: t.String(),
    newPriority: t.Integer({ minimum: 0 }),
  }),

  // Set default role
  setDefaultParams: t.Object({ id: t.String() }),

  // List permissions
  permissionResponse: t.Array(t.Object({
    permissionId: t.String(),
    name: t.String(),
    description: t.Nullable(t.String()),
  })),
} as const;

export type AdminRolesModel = {
  [k in keyof typeof AdminRolesModel]: UnwrapSchema<typeof AdminRolesModel[k]>;
};
