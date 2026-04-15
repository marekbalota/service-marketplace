import { useState, useEffect } from 'react'
import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'
import type { User, UserProfile } from '#/types/api'

const STORAGE_KEY = 'activeProfileId'

export const currentUserQueryOptions = queryOptions({
  queryKey: ['users', 'me'],
  queryFn: async () => {
    const { data, error } = await api.users.me.get()
    if (error) {
      if (error.status === 401) return null
      throw error
    }
    return data ?? null
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
})

export function useActiveProfile(user: User | null): {
  activeProfile: UserProfile | null
  setActiveProfileId: (id: string) => void
} {
  const [activeProfileId, setIdState] = useState<string | null>(null)

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setIdState(localStorage.getItem(STORAGE_KEY))
  }, [])

  // Clear localStorage when user is null (logout / session deleted / ban)
  useEffect(() => {
    if (!user) {
      setIdState(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  // Reset if stored profileId no longer belongs to this user's profiles
  useEffect(() => {
    if (user?.profiles && activeProfileId) {
      const exists = user.profiles.some(p => p.userProfileId === activeProfileId)
      if (!exists) {
        setIdState(null)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [user?.profiles, activeProfileId])

  const activeProfile: UserProfile | null =
    user?.profiles.find(p => p.userProfileId === activeProfileId) ??
    user?.profiles[0] ??
    null

  const setActiveProfileId = (id: string) => {
    setIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  return { activeProfile, setActiveProfileId }
}
