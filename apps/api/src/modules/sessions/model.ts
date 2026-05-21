import { t, type UnwrapSchema } from 'elysia'

export const SessionsModel = {
  sessionItem: t.Object({
    id: t.String(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    expiresAt: t.Date(),
    ipAddress: t.Nullable(t.String()),
    userAgent: t.Nullable(t.String()),
    location: t.Nullable(t.String()),
  }),
  idParams: t.Object({ id: t.String() }),
} as const

export type SessionsModel = {
  [k in keyof typeof SessionsModel]: UnwrapSchema<(typeof SessionsModel)[k]>
}
