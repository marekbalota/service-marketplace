import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export function locationsDistinctQueryOptions(params: {
  field: 'country' | 'region' | 'city'
  country?: string
  region?: string
}) {
  return queryOptions({
    queryKey: ['locations-distinct', params],
    queryFn: async () => {
      const { data, error } = await api.locations.distinct.get({ query: params })
      if (error) throw error
      return data!.values
    },
    staleTime: 5 * 60 * 1000,
  })
}
