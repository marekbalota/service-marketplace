import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Route } from './index'
import { useCurrentUser } from '#/lib/queries/users'

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn() }
})

const defaultStats = { totalUsers: 0, activePosts: 0, totalMessages: 0, activeBans: 0 }
const defaultRecentUsers = {
  items: [] as { userId: string; name: string; email: string; createdAt: string }[],
}

function mockQueries(stats = defaultStats, recentUsers = defaultRecentUsers, isPending = false) {
  vi.mocked(useQuery).mockImplementation(((options: { queryKey: unknown[] }) => {
    const key = options.queryKey
    if (key[1] === 'stats' && key[2] === 'recent-users') {
      return { data: recentUsers, isPending }
    }
    if (key[1] === 'stats') {
      return { data: stats, isPending }
    }
    return { data: undefined, isPending: false }
  }) as typeof useQuery)
}

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueries()
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as unknown as ReturnType<
      typeof useCurrentUser
    >)
  })

  it('renders Admin Dashboard heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument()
  })

  it('shows Manage Accounts when user has AdminUsersView', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:users:view'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByText('Manage Accounts')).toBeInTheDocument()
    expect(screen.queryByText('Manage Reports')).not.toBeInTheDocument()
  })

  it('shows Manage Reports when user has AdminReportsManage', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:reports:manage'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByText('Manage Reports')).toBeInTheDocument()
    expect(screen.queryByText('Manage Accounts')).not.toBeInTheDocument()
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

  it('shows live stat numbers from adminStatsQueryOptions', async () => {
    mockQueries({ totalUsers: 99, activePosts: 42, totalMessages: 7, activeBans: 3 })
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:stats:view'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByText('99')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows new users list when user has AdminUsersView', async () => {
    mockQueries(defaultStats, {
      items: [
        {
          userId: 'u1',
          name: 'Alice Smith',
          email: 'alice@example.com',
          createdAt: new Date().toISOString(),
        },
      ],
    })
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:users:view'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('hides new users list when user lacks AdminUsersView', async () => {
    mockQueries(defaultStats, {
      items: [
        {
          userId: 'u1',
          name: 'Alice Smith',
          email: 'alice@example.com',
          createdAt: new Date().toISOString(),
        },
      ],
    })
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:stats:view'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
  })

  it('hides stat cards when user has no stats/analytics permission', async () => {
    mockQueries({ totalUsers: 99, activePosts: 42, totalMessages: 7, activeBans: 3 })
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:users:view'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.queryByText('99')).not.toBeInTheDocument()
    expect(screen.queryByText('42')).not.toBeInTheDocument()
  })

  it('shows stat cards as links when user has analytics permission', async () => {
    mockQueries({ totalUsers: 5, activePosts: 0, totalMessages: 0, activeBans: 0 })
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:analytics:view'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /total users|active posts|messages/i }).length,
    ).toBeGreaterThan(0)
  })
})
