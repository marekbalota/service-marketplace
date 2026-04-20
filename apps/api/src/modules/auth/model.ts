import { t, type UnwrapSchema } from "elysia";

export const AuthModel = {
  unauthorizedResponse: t.Object({ message: t.String() }),
  forbiddenResponse:    t.Object({ message: t.String() }),
  bannedResponse: t.Object({
    message: t.String(),
    reason: t.Nullable(t.String()),
    expiresAt: t.Nullable(t.Date()),
  }),
  banCheckResult: t.Object({
    isBanned: t.Boolean(),
    reason: t.Nullable(t.String()),
    expiresAt: t.Nullable(t.Date()),
  })
} as const;

export type AuthModel = {
  [k in keyof typeof AuthModel]: UnwrapSchema<typeof AuthModel[k]>
};
