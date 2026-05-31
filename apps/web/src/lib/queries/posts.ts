// apps/web/src/lib/queries/posts.ts
import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export function postDetailQueryOptions(postId: string, locale: string) {
  return queryOptions({
    queryKey: ['posts', postId, locale] as const,
    queryFn: async () => {
      const { data, error } = await api.posts({ id: postId }).get()
      if (error) throw error
      return data!
    },
  })
}

export function categoriesQueryOptions(locale: string) {
  return queryOptions({
    queryKey: ['categories', locale] as const,
    queryFn: async () => {
      const { data, error } = await api.categories.get()
      if (error) throw error
      return data
    },
  })
}

export function favouritesQueryOptions(profileId: string, locale: string) {
  return queryOptions({
    queryKey: ['favourites', profileId, locale],
    queryFn: async () => {
      const { data, error } = await api.favourites.get({ query: { profileId } })
      if (error) throw error
      return data
    },
  })
}
