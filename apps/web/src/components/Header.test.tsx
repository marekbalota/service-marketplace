import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { Header } from './Header'

const mockUseSession = vi.hoisted(() => vi.fn())
const mockUseActiveProfile = vi.hoisted(() => vi.fn())

vi.mock('#/auth', () => ({
  authClient: { useSession: mockUseSession },
}))

vi.mock('#/contexts/ActiveProfileContext', () => ({
  useActiveProfile: mockUseActiveProfile,
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
    mockUseActiveProfile.mockReturnValue({ activeProfile: null })
  })

  it('shows Log in and Register links when logged out', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    await renderHeader()
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })

  it('hides auth links while session is loading', async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })
    await renderHeader()
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument()
  })

  it('shows profile button and hides auth links when logged in', async () => {
    mockUseSession.mockReturnValue({ data: { user: { name: 'Alice' } }, isPending: false })
    mockUseActiveProfile.mockReturnValue({
      activeProfile: { name: 'Alice', userProfileId: 'profile-1', roleName: 'user' },
    })
    await renderHeader()
    expect(screen.queryByRole('link', { name: /log in/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /alice/i })).toBeInTheDocument()
  })

  it('falls back to "Profile" in the button label when no active profile name is set', async () => {
    mockUseSession.mockReturnValue({ data: { user: { name: 'Alice' } }, isPending: false })
    await renderHeader()
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument()
  })
})
