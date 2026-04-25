import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { Header } from './Header'
import type { User } from '#/types/api'

vi.mock('#/lib/userQueries', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('#/hooks/useActiveProfile', () => ({
  useActiveProfile: vi.fn(),
}))

import { useCurrentUser } from '#/lib/userQueries'
import { useActiveProfile } from '#/hooks/useActiveProfile'

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
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: null, setActiveProfileId: vi.fn() })
  })

  it('shows Log in and Register links when user is null', async () => {
    await renderHeader()
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })

  it('shows profile button and hides auth links when user is not null', async () => {
    const user: User = { userId: 'u1', name: 'Alice', email: 'alice@example.com', role: null, profiles: [] }
    vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'p1', name: 'Alice', email: 'alice@example.com' } as User['profiles'][number],
      setActiveProfileId: vi.fn(),
    })
    await renderHeader()
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /alice/i })).toBeInTheDocument()
  })

  it('falls back to "Profile" in the button label when no active profile name is set', async () => {
    const user: User = { userId: 'u1', name: 'Alice', email: 'alice@example.com', role: null, profiles: [] }
    vi.mocked(useCurrentUser).mockReturnValue({ data: user } as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: null, setActiveProfileId: vi.fn() })
    await renderHeader()
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument()
  })
})
