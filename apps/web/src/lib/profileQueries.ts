import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'
import { useActiveUser } from '#/contexts/ActiveUserContext'

export const profilesQueryOptions = queryOptions({
  queryKey: ['profiles', 'me'],
  queryFn: async () => {
    const { data, error } = await api.profiles.me.get()
    if (error) throw error
    return data!
  },
})

export function useActiveProfile() {
  const { activeProfile } = useActiveUser()
  return { activeProfile }
}

export function profileQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['profiles', profileId],
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).get()
      if (error) throw error
      return data!
    },
  })
}

export function imagesQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['profiles', profileId, 'images'],
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).images.get()
      if (error) throw error
      return data ?? []
    },
  })
}
