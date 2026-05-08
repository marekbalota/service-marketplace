// apps/web/src/lib/queries/posts.ts
import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export function postDetailQueryOptions(postId: string) {
  return queryOptions({
    queryKey: ['posts', postId] as const,
    queryFn: async () => {
      const { data, error } = await api.posts({ id: postId }).get()
      if (error) throw error
      return data!
    },
  })
}

export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'],
  queryFn: async () => {
    const { data, error } = await api.categories.get()
    if (error) throw error
    return data
  },
})

export function favouritesQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['favourites', profileId],
    queryFn: async () => {
      const { data, error } = await api.favourites.get({ query: { profileId } })
      if (error) throw error
      return data
    },
  })
}
