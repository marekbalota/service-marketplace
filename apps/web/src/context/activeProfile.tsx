import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useCurrentUser } from '#/lib/queries/users'
import type { UserProfile } from '#/types/api'

const STORAGE_KEY = 'activeProfileId'

type ActiveProfileContextValue = {
  activeProfile: UserProfile | null
  setActiveProfileId: (id: string) => void
}

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null)

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const { data: user } = useCurrentUser()

  // Start null — reading localStorage in useState initializer crashes during SSR
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null)
  // Guards the "sync first-profile default" effect from running before localStorage is read
  const [hydrated, setHydrated] = useState(false)

  // Read localStorage after mount — safe from server-side rendering
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setActiveProfileIdState(stored)
    setHydrated(true)
  }, [])

  // Clear when user logs out or is banned — user === null means the API returned 401
  useEffect(() => {
    if (user === null) {
      setActiveProfileIdState(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  // Reset if the stored profile was deleted from the user's account
  useEffect(() => {
    if (user?.profiles && activeProfileId) {
      const exists = user.profiles.some((p) => p.userProfileId === activeProfileId)
      if (!exists) {
        setActiveProfileIdState(null)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [user?.profiles, activeProfileId])

  const activeProfile =
    user?.profiles.find((p) => p.userProfileId === activeProfileId) ?? user?.profiles[0] ?? null

  // Sync the resolved first-profile default back to localStorage so it persists on next load.
  // Guarded by `hydrated` so it doesn't overwrite the stored ID before it has been read.
  useEffect(() => {
    if (!hydrated) return
    if (activeProfile) {
      localStorage.setItem(STORAGE_KEY, activeProfile.userProfileId)
      setActiveProfileIdState(activeProfile.userProfileId)
    }
  }, [hydrated, activeProfile?.userProfileId])

  const setActiveProfileId = useCallback((id: string) => {
    setActiveProfileIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const value = useMemo(
    () => ({ activeProfile, setActiveProfileId }),
    [activeProfile, setActiveProfileId],
  )

  return <ActiveProfileContext.Provider value={value}>{children}</ActiveProfileContext.Provider>
}

export function useActiveProfile(): {
  activeProfile: UserProfile | null
  setActiveProfileId: (id: string) => void
} {
  const ctx = useContext(ActiveProfileContext)
  if (!ctx) throw new Error('useActiveProfile must be used within ActiveProfileProvider')
  return ctx
}
