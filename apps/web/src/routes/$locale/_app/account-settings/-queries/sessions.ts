import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export const sessionsQueryOptions = queryOptions({
  queryKey: ['sessions'] as const,
  queryFn: async () => {
    const { data, error } = await api.sessions.get()
    if (error) throw error
    return data ?? []
  },
})
