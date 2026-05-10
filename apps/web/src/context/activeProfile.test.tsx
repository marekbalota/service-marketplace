import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile, ActiveProfileProvider } from './activeProfile'

const mockUseCurrentUser = vi.mocked(useCurrentUser)

function makeQueryResult(profiles: { userProfileId: string; name: string }[] | null) {
  return {
    data: profiles === null ? null : { profiles },
  } as ReturnType<typeof useCurrentUser>
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <ActiveProfileProvider>{children}</ActiveProfileProvider>
)

describe('useActiveProfile', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockUseCurrentUser.mockReturnValue(makeQueryResult(null))
  })

  it('returns null activeProfile when user is null', () => {
    const { result } = renderHook(() => useActiveProfile(), { wrapper })
    expect(result.current.activeProfile).toBeNull()
  })

  it('returns null activeProfile when user has no profiles', () => {
    mockUseCurrentUser.mockReturnValue(makeQueryResult([]))
    const { result } = renderHook(() => useActiveProfile(), { wrapper })
    expect(result.current.activeProfile).toBeNull()
  })

  it('returns first profile when no ID is stored in localStorage', () => {
    mockUseCurrentUser.mockReturnValue(
      makeQueryResult([
        { userProfileId: 'p1', name: 'Alice' },
        { userProfileId: 'p2', name: 'Bob' },
      ]),
    )
    const { result } = renderHook(() => useActiveProfile(), { wrapper })
    expect(result.current.activeProfile?.userProfileId).toBe('p1')
  })

  it('returns profile matching the stored localStorage ID', () => {
    localStorage.setItem('activeProfileId', 'p2')
    mockUseCurrentUser.mockReturnValue(
      makeQueryResult([
        { userProfileId: 'p1', name: 'Alice' },
        { userProfileId: 'p2', name: 'Bob' },
      ]),
    )
    const { result } = renderHook(() => useActiveProfile(), { wrapper })
    expect(result.current.activeProfile?.userProfileId).toBe('p2')
  })

  it('falls back to first profile and updates localStorage when stored ID is not in profiles', () => {
    localStorage.setItem('activeProfileId', 'p-deleted')
    mockUseCurrentUser.mockReturnValue(makeQueryResult([{ userProfileId: 'p1', name: 'Alice' }]))
    const { result } = renderHook(() => useActiveProfile(), { wrapper })
    expect(result.current.activeProfile?.userProfileId).toBe('p1')
    expect(localStorage.getItem('activeProfileId')).toBe('p1')
  })

  it('clears activeProfile and localStorage when user becomes null', () => {
    mockUseCurrentUser.mockReturnValue(makeQueryResult([{ userProfileId: 'p1', name: 'Alice' }]))
    const { result, rerender } = renderHook(() => useActiveProfile(), { wrapper })
    expect(result.current.activeProfile?.userProfileId).toBe('p1')

    mockUseCurrentUser.mockReturnValue(makeQueryResult(null))
    rerender()

    expect(result.current.activeProfile).toBeNull()
    expect(localStorage.getItem('activeProfileId')).toBeNull()
  })

  it('setActiveProfileId switches active profile and writes to localStorage', () => {
    mockUseCurrentUser.mockReturnValue(
      makeQueryResult([
        { userProfileId: 'p1', name: 'Alice' },
        { userProfileId: 'p2', name: 'Bob' },
      ]),
    )
    const { result } = renderHook(() => useActiveProfile(), { wrapper })

    act(() => result.current.setActiveProfileId('p2'))

    expect(result.current.activeProfile?.userProfileId).toBe('p2')
    expect(localStorage.getItem('activeProfileId')).toBe('p2')
  })
})
