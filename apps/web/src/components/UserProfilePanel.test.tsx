import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { UserProfilePanel } from './UserProfilePanel'
import type { User } from '#/types/api'

const mockSignOut = vi.hoisted(() => vi.fn())
const mockInvalidate = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())
const mockSetQueryData = vi.hoisted(() => vi.fn())
const mockClear = vi.hoisted(() => vi.fn())

vi.mock('#/auth', () => ({
  authClient: { signOut: mockSignOut },
}))

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
}))

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(),
}))

vi.mock('#/router', () => ({
  queryClient: { setQueryData: mockSetQueryData, clear: mockClear },
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

import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'

const baseProfile: User['profiles'][number] = {
  userProfileId: 'profile-1',
  name: 'Alice',
  email: 'alice@example.com',
  bio: null,
  phoneNumber: null,
  fax: null,
  createdAt: new Date(),
  updatedAt: null,
}

const baseUser: User = {
  userId: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  impersonatedBy: null,
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
    mockSetQueryData.mockReset()
    mockClear.mockReset()
    vi.mocked(useCurrentUser).mockReturnValue({ data: baseUser } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: baseProfile, setActiveProfileId: vi.fn() })
  })

  it('renders Browse Postings and My Postings navigation links', async () => {
    await renderPanel()
    expect(screen.getByText('Browse Postings')).toBeInTheDocument()
    expect(screen.getByText('My Postings')).toBeInTheDocument()
  })

  it('calls signOut, removes user query, and invalidates router on log out', async () => {
    const onClose = vi.fn()
    await renderPanel(onClose)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    })
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockSetQueryData).toHaveBeenCalledWith(['users', 'me'], null)
    expect(mockInvalidate).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the profile switcher when profiles are available', async () => {
    await renderPanel()
    expect(screen.getByText('Switch Profile')).toBeInTheDocument()
  })

  it('hides the profile switcher when there are no profiles', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, profiles: [] },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: null, setActiveProfileId: vi.fn() })
    await renderPanel()
    expect(screen.queryByText('Switch Profile')).not.toBeInTheDocument()
  })
})
