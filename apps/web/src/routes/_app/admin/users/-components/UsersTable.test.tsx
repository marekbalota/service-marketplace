import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsersTable } from './UsersTable'

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())
const mockUseNavigate = vi.hoisted(() => vi.fn(() => vi.fn()))
const mockUseSearch = vi.hoisted(() => vi.fn(() => ({ q: '', role: 'all', status: 'all', page: 1 })))

vi.mock('../index', () => ({
  Route: {
    useNavigate: mockUseNavigate,
    useSearch: mockUseSearch,
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useQuery: vi.fn(() => ({ data: [] })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
      isError: false,
    })),
  }
})

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(() => ({
    data: { userId: 'admin-1', role: { permissions: [] } },
  })),
}))

vi.mock('#/api', () => ({
  api: {
    admin: {
      users: Object.assign(vi.fn(() => ({
        role: { patch: vi.fn().mockResolvedValue({ error: null }) },
        ban: { patch: vi.fn().mockResolvedValue({ error: null }) },
        unban: { patch: vi.fn().mockResolvedValue({ error: null }) },
      })), {
        get: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      roles: {
        assignable: { get: vi.fn().mockResolvedValue({ data: [], error: null }) },
      },
    },
  },
}))

const baseUser = {
  userId: 'user-1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  isBanned: false,
  role: { roleId: 'role-1', name: 'Member' },
  createdAt: new Date('2024-01-01').toISOString(),
}

async function renderTable() {
  await act(async () => render(<UsersTable />))
}

describe('UsersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNavigate.mockReturnValue(vi.fn())
    mockUseSearch.mockReturnValue({ q: '', role: 'all', status: 'all', page: 1 })
    mockUseSuspenseQuery.mockReturnValue({
      data: { items: [], total: 0, totalBanned: 0, totalPages: 1 },
      isFetching: false,
    })
  })

  it('renders three stat cards', async () => {
    await renderTable()
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('Active Users')).toBeInTheDocument()
    expect(screen.getByText('Banned')).toBeInTheDocument()
  })

  it('shows correct stat values', async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: { items: [], total: 12, totalBanned: 3, totalPages: 1 },
      isFetching: false,
    })
    await renderTable()
    expect(screen.getByText('12')).toBeInTheDocument()  // Total Users
    expect(screen.getByText('9')).toBeInTheDocument()   // Active Users (12 - 3)
    expect(screen.getByText('3')).toBeInTheDocument()   // Banned
  })

  it('renders a user card for each user', async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: { items: [baseUser], total: 1, totalBanned: 0, totalPages: 1 },
      isFetching: false,
    })
    await renderTable()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows EmptyState when items list is empty', async () => {
    await renderTable()
    expect(screen.getByText(/no accounts found/i)).toBeInTheDocument()
  })

  it('renders PaginationBar when totalPages > 1', async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: { items: [], total: 0, totalBanned: 0, totalPages: 3 },
      isFetching: false,
    })
    await renderTable()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('does not render PaginationBar when totalPages is 1', async () => {
    await renderTable()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
