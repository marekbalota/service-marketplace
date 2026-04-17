import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { Header } from './Header'
import type { User } from '#/types/api'

const mockUser = vi.hoisted(() => ({ current: null as User | null }))
const mockUseActiveUser = vi.hoisted(() => vi.fn())

vi.mock('#/contexts/ActiveUserContext', () => ({
  useActiveUser: mockUseActiveUser,
}))

async function renderHeader() {
  const rootRoute = createRootRoute({ component: Header })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('Header', () => {
  beforeEach(() => {
    mockUser.current = null
    mockUseActiveUser.mockReturnValue({ user: null, activeProfile: null, setActiveProfileId: vi.fn(), isLoading: false })
  })

  it('shows Log in and Register links when user is null', async () => {
    await renderHeader()
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })

  it('shows profile button and hides auth links when user is not null', async () => {
    mockUser.current = { userId: 'u1', name: 'Alice', email: 'alice@example.com', role: null, profiles: [] }
    mockUseActiveUser.mockReturnValue({
      user: { userId: 'u1', name: 'Alice', email: 'alice@example.com', role: null, profiles: [] },
      activeProfile: { userProfileId: 'p1', name: 'Alice', email: 'alice@example.com' },
      setActiveProfileId: vi.fn(),
      isLoading: false,
    })
    await renderHeader()
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /alice/i })).toBeInTheDocument()
  })

  it('falls back to "Profile" in the button label when no active profile name is set', async () => {
    mockUser.current = { userId: 'u1', name: 'Alice', email: 'alice@example.com', role: null, profiles: [] }
    mockUseActiveUser.mockReturnValue({
      user: { userId: 'u1', name: 'Alice', email: 'alice@example.com', role: null, profiles: [] },
      activeProfile: null,
      setActiveProfileId: vi.fn(),
      isLoading: false,
    })
    await renderHeader()
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument()
  })
})
