import { Elysia } from 'elysia'
import { authRoutes } from '../auth'
import { TwoFactorModel } from './model'
import { TwoFactorService } from './service'
import { unauthorizedResponse } from '../../lib/errors'

export const twoFactorRoutes = new Elysia({ prefix: '/two-factor' })
  .use(authRoutes)
  .get(
    '/status',
    async ({ user }) => {
      const enabledMethods = await TwoFactorService.getEnabledMethods(user.id)
      return {
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        enabledMethods,
      }
    },
    {
      auth: true,
      response: {
        200: TwoFactorModel.statusResponse,
        ...unauthorizedResponse,
      },
      detail: { summary: 'Get 2FA status for current user', tags: ['Auth'] },
    },
  )
