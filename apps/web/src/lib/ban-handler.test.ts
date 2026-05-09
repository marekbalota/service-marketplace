import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('#/router', () => ({
  routerRef: {
    invalidate: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn().mockResolvedValue(undefined),
  },
  queryClient: {
    removeQueries: vi.fn(),
  },
}))

vi.mock('#/lib/queries/users', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
}))

import { handleBanError } from './ban-handler'
import { routerRef, queryClient } from '#/router'

const mockRouterRef = routerRef as unknown as { invalidate: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> }
const mockQueryClient = queryClient as unknown as { removeQueries: ReturnType<typeof vi.fn> }

describe('handleBanError', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('returns false for a generic non-ban error', () => {
    expect(handleBanError(new Error('network error'))).toBe(false)
    expect(mockQueryClient.removeQueries).not.toHaveBeenCalled()
  })

  it('returns false for a non-ban API error', () => {
    expect(handleBanError({ status: 404, message: 'not found' })).toBe(false)
  })

  it('removes user query, clears localStorage, invalidates router, and navigates to /banned', () => {
    const error = { body: { code: 'BANNED', message: 'User is banned', reason: 'Spam', expiresAt: '2026-12-01T00:00:00Z' } }
    localStorage.setItem('activeProfileId', 'p1')

    const result = handleBanError(error)

    expect(result).toBe(true)
    expect(mockQueryClient.removeQueries).toHaveBeenCalledWith({ queryKey: ['users', 'me'] })
    expect(localStorage.getItem('activeProfileId')).toBeNull()
    expect(mockRouterRef.invalidate).toHaveBeenCalled()
    expect(mockRouterRef.navigate).toHaveBeenCalledWith({ to: '/banned' })
  })

  it('stores ban reason and expiresAt in sessionStorage', () => {
    const error = { body: { code: 'BANNED', message: 'Account banned', reason: 'TOS violation', expiresAt: null } }
    handleBanError(error)
    const stored = JSON.parse(sessionStorage.getItem('banInfo') ?? '{}')
    expect(stored.reason).toBe('TOS violation')
    expect(stored.expiresAt).toBeNull()
  })
})
