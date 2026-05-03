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
  useCurrentUser: vi.fn(),
}))

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('AdminDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Admin Dashboard heading', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument()
  })

  it('shows Manage Accounts and Manage Reports when user has AdminUsersView', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:users:view'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByText('Manage Accounts')).toBeInTheDocument()
    expect(screen.getByText('Manage Reports and Bans')).toBeInTheDocument()
  })

  it('shows Manage Roles when user has AdminRolesManage', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:roles:manage'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByText('Manage Roles')).toBeInTheDocument()
  })

  it('shows Manage Categories when user has AdminCategoriesManage', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:categories:manage'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByText('Manage Categories')).toBeInTheDocument()
  })

  it('hides all option cards when user has no permissions', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: [] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.queryByText('Manage Accounts')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Roles')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Reports and Bans')).not.toBeInTheDocument()
    expect(screen.queryByText('Manage Categories')).not.toBeInTheDocument()
  })
})
