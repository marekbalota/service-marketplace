import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export const twoFactorStatusQueryOptions = queryOptions({
  queryKey: ['two-factor', 'status'] as const,
  queryFn: async () => {
    const { data, error } = await api['two-factor'].status.get()
    if (error) {
      if (error.status === 401) return null
      throw error
    }
    return data ?? null
  },
  staleTime: 30 * 1000,
})
