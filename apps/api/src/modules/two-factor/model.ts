import { t } from 'elysia'

export const TwoFactorModel = {
  statusResponse: t.Object({
    twoFactorEnabled: t.Boolean(),
    totpEnabled: t.Boolean(),
  }),
}
