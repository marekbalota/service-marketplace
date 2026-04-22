import { useState, useEffect } from 'react'
import { useCurrentUser } from '#/lib/userQueries'
import type { UserProfile } from '#/types/api'

const STORAGE_KEY = 'activeProfileId'

export function useActiveProfile(): {
  activeProfile: UserProfile | null
  setActiveProfileId: (id: string) => void
} {
  const { data: user } = useCurrentUser()

  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  )

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
    user?.profiles.find((p) => p.userProfileId === activeProfileId) ??
    user?.profiles[0] ??
    null

  // Sync the resolved first-profile default back to localStorage so it persists on next load
  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem(STORAGE_KEY, activeProfile.userProfileId)
      setActiveProfileIdState(activeProfile.userProfileId)
    }
  }, [activeProfile?.userProfileId])

  const setActiveProfileId = (id: string) => {
    setActiveProfileIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  return { activeProfile, setActiveProfileId }
}
