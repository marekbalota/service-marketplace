import { t } from 'elysia'

export const TwoFactorModel = {
  statusResponse: t.Object({
    twoFactorEnabled: t.Boolean(),
    enabledMethods: t.Array(t.Union([t.Literal('email'), t.Literal('totp')])),
  }),
}
