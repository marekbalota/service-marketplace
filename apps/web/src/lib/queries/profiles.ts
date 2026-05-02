import { queryOptions } from '@tanstack/react-query'
import { keepPreviousData } from '@tanstack/react-query'
import { api } from '#/api'

const PAGE_SIZE = 12

export function profileQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['profiles', profileId] as const,
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).get()
      if (error) throw error
      return data!
    },
  })
}

export function imagesQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['profiles', profileId, 'images'] as const,
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).images.get()
      if (error) throw error
      return data ?? []
    },
  })
}

export function profilePostsQueryOptions(profileId: string, page: number, archived = false) {
  return queryOptions({
    queryKey: ['profiles', profileId, 'posts', { page, archived }] as const,
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).posts.get({
        query: {
          offset: (page - 1) * PAGE_SIZE,
          size: PAGE_SIZE,
          archived,
        },
      })
      if (error) throw error
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export function profileLocationsQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['locations', 'profile', profileId] as const,
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).locations.get()
      if (error) throw error
      return data ?? []
    },
    enabled: !!profileId,
  })
}
