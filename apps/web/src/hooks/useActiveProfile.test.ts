import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// localStorage is provided by jsdom — spy on it
const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

import { useActiveProfile } from './useActiveProfile'
import type { User } from '../types/api'

const profile1 = { userProfileId: 'p1', name: 'Alice', email: 'alice@example.com' }
const profile2 = { userProfileId: 'p2', name: 'Bob', email: 'bob@example.com' }

const baseUser: User = {
  userId: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  role: null,
  profiles: [profile1, profile2],
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('useActiveProfile', () => {
  it('returns null activeProfile when user is null', () => {
    const { result } = renderHook(() => useActiveProfile(null))
    expect(result.current.activeProfile).toBeNull()
  })

  it('defaults to profiles[0] when no stored profileId', () => {
    const { result } = renderHook(() => useActiveProfile(baseUser))
    expect(result.current.activeProfile).toEqual(profile1)
  })

  it('hydrates activeProfileId from localStorage after mount', async () => {
    localStorage.setItem('activeProfileId', 'p2')
    const { result } = renderHook(() => useActiveProfile(baseUser))
    await act(async () => {})
    expect(result.current.activeProfile).toEqual(profile2)
  })

  it('clears localStorage and activeProfile when user becomes null', async () => {
    let user: User | null = baseUser
    const { result, rerender } = renderHook(() => useActiveProfile(user))
    await act(async () => {})
    user = null
    rerender()
    await act(async () => {})
    expect(result.current.activeProfile).toBeNull()
    expect(removeItemSpy).toHaveBeenCalledWith('activeProfileId')
  })

  it('resets activeProfileId when stored profile no longer exists in user profiles', async () => {
    localStorage.setItem('activeProfileId', 'p-gone')
    const { result } = renderHook(() => useActiveProfile(baseUser))
    await act(async () => {})
    expect(result.current.activeProfile).toEqual(profile1)
    expect(removeItemSpy).toHaveBeenCalledWith('activeProfileId')
  })

  it('setActiveProfileId updates state and localStorage', async () => {
    const { result } = renderHook(() => useActiveProfile(baseUser))
    await act(async () => {
      result.current.setActiveProfileId('p2')
    })
    expect(result.current.activeProfile).toEqual(profile2)
    expect(setItemSpy).toHaveBeenCalledWith('activeProfileId', 'p2')
  })
})
