import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export function locationAutocompleteQueryOptions(params: { q: string }) {
  return queryOptions({
    queryKey: ['locations-autocomplete', params] as const,
    queryFn: async () => {
      const { data, error } = await api.locations.autocomplete.get({
        query: { q: params.q, limit: 5 },
      })
      if (error) throw error
      return data!.suggestions
    },
    enabled: params.q.length >= 2,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  })
}
