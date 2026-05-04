// apps/web/src/lib/queries/users.ts
import { queryOptions, useQuery } from '@tanstack/react-query'
import { api } from '#/api'

export const currentUserQueryOptions = queryOptions({
  queryKey: ['users', 'me'] as const,
  queryFn: async () => {
    const { data, error } = await api.users.me.get()
    if (error) {
      if (error.status === 401) return null
      throw error
    }
    return data ?? null
  },
  staleTime: 1 * 60 * 1000,
})

export function useCurrentUser() {
  return useQuery(currentUserQueryOptions)
}
