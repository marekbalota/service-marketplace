import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export function existingThreadQueryOptions(postId: string, profileId: string) {
  return queryOptions({
    queryKey: ['threads', 'by-post', postId, profileId],
    queryFn: async () => {
      const { data, error } = await api.threads.get({ query: { profileId, postId } })
      if (error) throw error
      return data ?? []
    },
  })
}
