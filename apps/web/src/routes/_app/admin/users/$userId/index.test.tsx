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

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useParams: vi.fn(() => ({ userId: 'user-1' })),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/router', () => ({ queryClient: { invalidateQueries: vi.fn() }, routerRef: null }))
vi.mock('#/auth', () => ({
  authClient: {
    signOut: vi.fn(),
    admin: { impersonateUser: vi.fn(), stopImpersonating: vi.fn() },
  },
}))

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

const baseUser = {
  userId: 'user-1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  isBanned: false,
  role: { name: 'Admin', priority: 0 },
  createdAt: new Date('2024-01-01').toISOString(),
}

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      if (Array.isArray(opts.queryKey) && opts.queryKey[3] === 'profiles') {
        return { data: [] }
      }
      return { data: baseUser }
    })
    vi.mocked(useCurrentUser).mockReturnValue({
      data: {
        userId: 'admin-1',
        name: 'Admin',
        email: 'admin@example.com',
        impersonatedBy: null,
        role: {
          roleId: 'r1',
          name: 'SuperAdmin',
          priority: 2,
          permissions: ['admin:users:impersonate'],
        },
        profiles: [],
      },
    } as unknown as ReturnType<typeof useCurrentUser>)
  })

  it('renders User Details heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /user details/i })).toBeInTheDocument()
  })

  it('renders Back to Users button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /back to users/i })).toBeInTheDocument()
  })

  it('shows user name and email from query data', async () => {
    await renderPage()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows active badge for a non-banned user', async () => {
    await renderPage()
    expect(screen.getByText(/^active$/i)).toBeInTheDocument()
  })

  it('shows banned badge for a banned user', async () => {
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      if (Array.isArray(opts.queryKey) && opts.queryKey[3] === 'profiles') {
        return { data: [] }
      }
      return { data: { ...baseUser, isBanned: true } }
    })
    await renderPage()
    expect(screen.getByText(/^banned$/i)).toBeInTheDocument()
  })

  it('shows empty state when user has no profiles', async () => {
    await renderPage()
    expect(screen.getByText(/no profiles found/i)).toBeInTheDocument()
  })

  it('Impersonate User button is hidden when currentUser lacks admin:users:impersonate permission', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: {
        userId: 'admin-1',
        name: 'Admin',
        email: 'admin@example.com',
        impersonatedBy: null,
        role: { roleId: 'r1', name: 'SuperAdmin', priority: 2, permissions: [] },
        profiles: [],
      },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.queryByRole('button', { name: /impersonate user/i })).not.toBeInTheDocument()
  })

  it('Impersonate User button is enabled when currentUser has permission and higher priority', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /impersonate user/i })).not.toBeDisabled()
  })

  it('Impersonate User button is disabled when currentUser has permission but equal or lower priority', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: {
        userId: 'admin-1',
        name: 'Admin',
        email: 'admin@example.com',
        impersonatedBy: null,
        role: { roleId: 'r1', name: 'User', priority: 0, permissions: ['admin:users:impersonate'] },
        profiles: [],
      },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByRole('button', { name: /impersonate user/i })).toBeDisabled()
  })

  it('Impersonate User button is disabled when currentUser is already impersonating', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: {
        userId: 'admin-1',
        name: 'Admin',
        email: 'admin@example.com',
        impersonatedBy: 'some-admin-id',
        role: {
          roleId: 'r1',
          name: 'SuperAdmin',
          priority: 2,
          permissions: ['admin:users:impersonate'],
        },
        profiles: [],
      },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByRole('button', { name: /impersonate user/i })).toBeDisabled()
  })

  it('Impersonate User button is disabled when currentUser has permission but target user has no role', async () => {
    vi.mocked(mockUseSuspenseQuery).mockImplementation((opts: { queryKey: unknown[] }) => {
      if (Array.isArray(opts.queryKey) && opts.queryKey[3] === 'profiles') {
        return { data: [] }
      }
      return { data: { ...baseUser, role: null } }
    })
    await renderPage()
    expect(screen.getByRole('button', { name: /impersonate user/i })).toBeDisabled()
  })
})
