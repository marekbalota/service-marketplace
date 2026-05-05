import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './index'
import { useCurrentUser } from '#/lib/queries/users'

vi.mock('#/lib/queries/users', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
  useCurrentUser: vi.fn(),
}))


// Switch uses Radix internals — stub it to a simple checkbox
vi.mock('#/components/ui/switch', () => ({
  Switch: ({ id, disabled }: { id?: string; disabled?: boolean }) => (
    <input type="checkbox" id={id} disabled={disabled} role="switch" />
  ),
}))

// IntersectionObserver is not available in jsdom
vi.stubGlobal('IntersectionObserver', vi.fn(() => ({
  observe:    vi.fn(),
  unobserve:  vi.fn(),
  disconnect: vi.fn(),
})))

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('AccountSettingsHubPage', () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { email: 'alice@example.com', profiles: [] },
    } as unknown as ReturnType<typeof useCurrentUser>)
  })

  it('renders the Account Settings heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /account settings/i })).toBeInTheDocument()
  })

  it('renders all 6 section card titles', async () => {
    await renderPage()
    expect(screen.getByText('Account Information')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Connected Accounts')).toBeInTheDocument()
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument()
    expect(screen.getByText('Login Management')).toBeInTheDocument()
    expect(screen.getByText('User Profiles')).toBeInTheDocument()
  })

  it('renders sidebar buttons for all 6 sections', async () => {
    await renderPage()
    const nav = document.querySelector('nav')
    const buttons = nav ? Array.from(nav.querySelectorAll('button')) : []
    expect(buttons).toHaveLength(6)
  })

  it('displays the current user email in Account Information', async () => {
    await renderPage()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('renders a Manage Profiles link pointing to /account-settings/profiles/', async () => {
    await renderPage()
    const link = screen.getByRole('link', { name: /manage profiles/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/account-settings/profiles/')
  })

  it('renders the Log Out All Devices button as disabled', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /log out all devices/i })).toBeDisabled()
  })

  it('renders the profile count in the User Profiles card', async () => {
    await renderPage()
    expect(screen.getByText(/0 Active Profiles/i)).toBeInTheDocument()
  })

  it('renders Change Email and Change Password buttons as disabled', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /change email/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /change password/i })).toBeDisabled()
  })
})
