import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { api } from '#/api'
import type { UserProfile } from '#/types'

const STORAGE_KEY = 'activeProfileId'

type ActiveProfileContextValue = {
  activeProfile: UserProfile | null
  allProfiles: UserProfile[]
  setActiveProfileId: (id: string) => void
  isLoading: boolean
}

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null)

export const userProfilesQueryOptions = queryOptions({
  queryKey: ['user-profiles'],
  queryFn: async () => {
    const { data, error } = await api['user-profiles'].get()
    if (error) throw error
    return data as UserProfile[]
  },
})

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null),
  )

  const { data: profiles = [], isLoading } = useQuery(userProfilesQueryOptions)

  // Auto-select the first profile when none is stored or the stored ID is no longer valid
  useEffect(() => {
    if (isLoading || profiles.length === 0) return
    const isValid = profiles.some((p) => p.userProfileId === activeProfileId)
    if (!isValid) {
      const firstId = profiles[0]!.userProfileId
      setActiveProfileIdState(firstId)
      localStorage.setItem(STORAGE_KEY, firstId)
    }
  }, [isLoading, profiles, activeProfileId])

  const setActiveProfileId = (id: string) => {
    setActiveProfileIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const activeProfile =
    profiles.find((p) => p.userProfileId === activeProfileId) ??
    profiles[0] ??
    null

  const accountProfiles = activeProfile
    ? profiles.filter((p) => p.accountId === activeProfile.accountId)
    : []

  return (
    <ActiveProfileContext.Provider
      value={{ activeProfile, allProfiles: accountProfiles, setActiveProfileId, isLoading }}
    >
      {children}
    </ActiveProfileContext.Provider>
  )
}

export function useActiveProfile() {
  const ctx = useContext(ActiveProfileContext)
  if (!ctx) throw new Error('useActiveProfile must be used inside ActiveProfileProvider')
  return ctx
}
