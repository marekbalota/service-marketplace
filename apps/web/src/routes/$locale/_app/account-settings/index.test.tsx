import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCurrentUser } from '#/lib/queries/users'

vi.mock('#/router', () => ({ queryClient: { invalidateQueries: vi.fn() } }))

vi.mock('#/lib/queries/users', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
  useCurrentUser: vi.fn(),
}))

vi.doMock('./-components/TwoFactorSection', () => ({
  TwoFactorSection: () => <div id="two-factor-auth">Two-Factor Authentication</div>,
}))

vi.doMock('./-components/LoginManagementSection', () => ({
  LoginManagementSection: () => (
    <div id="login-management">
      <p>Login Management</p>
      <button disabled>Log out from all other devices</button>
    </div>
  ),
}))

// Switch uses Radix internals — stub it to a simple checkbox
vi.mock('#/components/ui/switch', () => ({
  Switch: ({ id, disabled }: { id?: string; disabled?: boolean }) => (
    <input type="checkbox" id={id} disabled={disabled} role="switch" />
  ),
}))

// IntersectionObserver is not available in jsdom
vi.stubGlobal(
  'IntersectionObserver',
  vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
)

let Route: typeof import('./index').Route

beforeAll(async () => {
  Route = (await import('./index')).Route
})

async function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
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

  it('renders all 5 section card titles', async () => {
    await renderPage()
    expect(screen.getAllByText('Account Information')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Notifications')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Two-Factor Authentication')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Login Management')[0]).toBeInTheDocument()
    expect(screen.getAllByText('User Profiles')[0]).toBeInTheDocument()
  })

  it('renders sidebar buttons for all 5 sections', async () => {
    await renderPage()
    const nav = document.querySelector('nav')
    const buttons = nav ? Array.from(nav.querySelectorAll('button')) : []
    expect(buttons).toHaveLength(5)
  })

  it('displays the current user email in Account Information', async () => {
    await renderPage()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('renders a Manage Profiles link pointing to /account-settings/profiles', async () => {
    await renderPage()
    const link = screen.getByRole('link', { name: /manage profiles/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/en/account-settings/profiles')
  })

  it('renders the bulk logout button as disabled', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /log out from all other devices/i })).toBeDisabled()
  })

  it('renders the profile count in the User Profiles card', async () => {
    await renderPage()
    expect(screen.getByText(/0 Active Profiles/i)).toBeInTheDocument()
  })

  it('renders Change buttons as enabled', async () => {
    await renderPage()
    const changeButtons = screen.getAllByRole('button', { name: /^change (email|password)$/i })
    expect(changeButtons).toHaveLength(2)
    changeButtons.forEach((btn) => expect(btn).not.toBeDisabled())
  })

  it('disables Change buttons during impersonation', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { email: 'alice@example.com', profiles: [], impersonatedBy: 'admin-uuid' },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    const changeButtons = screen.getAllByRole('button', { name: /^change (email|password)$/i })
    expect(changeButtons).toHaveLength(2)
    changeButtons.forEach((btn) => expect(btn).toBeDisabled())
  })
})
