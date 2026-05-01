import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './index'

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
  return { ...actual, useSuspenseQuery: mockUseSuspenseQuery }
})

const baseUser = {
  userId: 'user-1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  isBanned: false,
  role: { name: 'Admin' },
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
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('shows banned badge for a banned user', async () => {
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      if (Array.isArray(opts.queryKey) && opts.queryKey[3] === 'profiles') {
        return { data: [] }
      }
      return { data: { ...baseUser, isBanned: true } }
    })
    await renderPage()
    expect(screen.getByText('banned')).toBeInTheDocument()
  })

  it('shows empty state when user has no profiles', async () => {
    await renderPage()
    expect(screen.getByText(/no profiles found/i)).toBeInTheDocument()
  })
})
