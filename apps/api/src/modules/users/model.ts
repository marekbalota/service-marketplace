import { t, type UnwrapSchema } from "elysia";

export const UsersModel = {
  meResponse: t.Object({
    userId: t.String(),
    name: t.String(),
    email: t.String(),
    role: t.Nullable(t.Object({
      roleId: t.String(),
      name: t.String(),
      priority: t.Number(),
      permissions: t.Array(t.String()),
    })),
    profiles: t.Array(
      t.Object({
        userProfileId: t.String(),
        name: t.String(),
        email: t.String()
      }),
    )
  })
} as const;

export type UsersModel = {
  [k in keyof typeof UsersModel]: UnwrapSchema<typeof UsersModel[k]>;
};
