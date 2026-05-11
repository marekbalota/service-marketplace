import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Header } from './Header'
import type { User } from '#/types/api'

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(),
}))

vi.mock('./ImpersonationBanner', () => ({
  ImpersonationBanner: () => <div data-testid="impersonation-banner">Impersonation Banner</div>,
}))

vi.mock('#/lib/queries/auth', () => ({
  useStopImpersonating: () => ({ mutate: vi.fn() }),
}))

vi.mock('#/router', () => ({
  queryClient: { setQueryData: vi.fn(), clear: vi.fn() },
}))

import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'

async function renderHeader() {
  const rootRoute = createRootRoute({ component: Header })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('Header', () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: null,
      setActiveProfileId: vi.fn(),
    })
  })

  it('shows Log in and Register links when user is null', async () => {
    await renderHeader()
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })

  it('shows profile button and hides auth links when user is not null', async () => {
    const user: User = {
      userId: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      impersonatedBy: null,
      role: null,
      profiles: [],
    }
    vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: {
        userProfileId: 'p1',
        name: 'Alice',
        email: 'alice@example.com',
      } as User['profiles'][number],
      setActiveProfileId: vi.fn(),
    })
    await renderHeader()
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /alice/i })).toBeInTheDocument()
  })

  it('shows profile button without name text when active profile is not yet available', async () => {
    const user: User = {
      userId: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      impersonatedBy: null,
      role: null,
      profiles: [],
    }
    vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: null,
      setActiveProfileId: vi.fn(),
    })
    await renderHeader()
    expect(screen.getByTestId('profile-menu-trigger')).toBeInTheDocument()
    expect(screen.queryByText(/^profile$/i)).not.toBeInTheDocument()
  })

  it('shows impersonation banner when user has impersonatedBy set', async () => {
    const user: User = {
      userId: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      impersonatedBy: 'admin-id',
      role: null,
      profiles: [],
    }
    vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: null,
      setActiveProfileId: vi.fn(),
    })
    await renderHeader()
    expect(screen.getByTestId('impersonation-banner')).toBeInTheDocument()
  })

  it('does not show impersonation banner when impersonatedBy is null', async () => {
    const user: User = {
      userId: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      impersonatedBy: null,
      role: null,
      profiles: [],
    }
    vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: null,
      setActiveProfileId: vi.fn(),
    })
    await renderHeader()
    expect(screen.queryByTestId('impersonation-banner')).not.toBeInTheDocument()
  })
})
