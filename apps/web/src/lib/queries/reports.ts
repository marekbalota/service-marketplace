import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export function reportCategoriesQueryOptions(targetType: 'POST' | 'MESSAGE' | 'REVIEW') {
  return queryOptions({
    queryKey: ['report-categories', targetType],
    queryFn: async () => {
      const { data, error } = await api['report-categories'].get({ query: { targetType } })
      if (error) throw error
      return data ?? []
    },
  })
}
