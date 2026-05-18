import { queryOptions } from '@tanstack/react-query'
import { authClient } from '#/auth'
import type { TwoFactorMethod } from '@marketplace/shared'

export type TwoFactorStatus = {
  twoFactorEnabled: boolean
  enabledMethods: TwoFactorMethod[]
}

export const twoFactorStatusQueryOptions = queryOptions({
  queryKey: ['two-factor', 'status'] as const,
  queryFn: async (): Promise<TwoFactorStatus | null> => {
    const { data, error } = await authClient.twoFactor.status()
    if (error) {
      if (error.status === 401) return null
      throw error
    }
    return data ?? null
  },
  staleTime: 30 * 1000,
})
