import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { UserProfilePanel } from './UserProfilePanel'
import type { User } from '#/types/api'

const mockSignOut = vi.hoisted(() => vi.fn())
const mockUseActiveUser = vi.hoisted(() => vi.fn())
const mockInvalidate = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())
const mockQueryClientClear = vi.hoisted(() => vi.fn())
const mockUser = vi.hoisted(() => ({ current: null as User | null }))

vi.mock('#/auth', () => ({
  authClient: { signOut: mockSignOut },
}))

vi.mock('#/contexts/ActiveUserContext', () => ({
  useActiveUser: mockUseActiveUser,
}))

vi.mock('#/router', () => ({
  queryClient: { clear: mockQueryClientClear },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useRouter: () => ({ invalidate: mockInvalidate, navigate: mockNavigate }),
  }
})

vi.mock('#/components/ui/sheet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#/components/ui/sheet')>()
  return {
    ...actual,
    SheetClose: ({ render: renderProp, children }: { render?: React.ReactElement; children?: React.ReactNode }) =>
      renderProp ? React.cloneElement(renderProp, {}, children) : <>{children}</>,
  }
})

const baseProfile = {
  userProfileId: 'profile-1',
  name: 'Alice',
  email: 'alice@example.com',
}

const baseUser: User = {
  userId: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  role: null,
  profiles: [baseProfile],
}

async function renderPanel(onClose = vi.fn()) {
  const rootRoute = createRootRoute({ component: () => <UserProfilePanel onClose={onClose} /> })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('UserProfilePanel', () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue(undefined)
    mockInvalidate.mockReset()
    mockQueryClientClear.mockReset()
    mockUser.current = baseUser
    mockUseActiveUser.mockReturnValue({
      user: baseUser,
      activeProfile: baseProfile,
      setActiveProfileId: vi.fn(),
      isLoading: false,
    })
  })

  it('renders Browse Postings and My Postings navigation links', async () => {
    await renderPanel()
    expect(screen.getByText('Browse Postings')).toBeInTheDocument()
    expect(screen.getByText('My Postings')).toBeInTheDocument()
  })

  it('calls signOut, clears queryClient, and invalidates router on log out', async () => {
    const onClose = vi.fn()
    await renderPanel(onClose)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    })
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockQueryClientClear).toHaveBeenCalled()
    expect(mockInvalidate).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the profile switcher when profiles are available', async () => {
    await renderPanel()
    expect(screen.getByText('Switch Profile')).toBeInTheDocument()
  })

  it('hides the profile switcher when there are no profiles', async () => {
    mockUser.current = { ...baseUser, profiles: [] }
    mockUseActiveUser.mockReturnValue({
      user: { ...baseUser, profiles: [] },
      activeProfile: null,
      setActiveProfileId: vi.fn(),
      isLoading: false,
    })
    await renderPanel()
    expect(screen.queryByText('Switch Profile')).not.toBeInTheDocument()
  })
})
