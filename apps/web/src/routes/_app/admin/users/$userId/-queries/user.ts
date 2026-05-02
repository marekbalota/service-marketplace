import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export const userDetailQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['admin', 'users', userId],
    queryFn: async () => {
      const { data, error } = await api.admin.users({ id: userId }).get()
      if (error) throw error
      return data!
    },
  })

export const userProfilesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['admin', 'users', userId, 'profiles'],
    queryFn: async () => {
      const { data, error } = await api.admin.users({ id: userId }).profiles.get()
      if (error) throw error
      return data ?? []
    },
  })
