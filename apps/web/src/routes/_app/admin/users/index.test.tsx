import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './index'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useSearch: vi.fn(() => ({})),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [] })),
    useSuspenseQuery: vi.fn(() => ({ data: { items: [], totalPages: 1, total: 0, stats: {} } })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  }
})

vi.mock('#/api', () => ({
  api: {
    admin: {
      users: Object.assign(
        vi.fn(() => ({})),
        {
          get: vi.fn().mockResolvedValue({ data: [], error: null }),
        },
      ),
      roles: { get: vi.fn().mockResolvedValue({ data: [], error: null }) },
    },
  },
}))

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('ManageAccounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Manage Accounts heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /manage accounts/i })).toBeInTheDocument()
  })

  it('renders the Back to Admin button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /back to admin/i })).toBeInTheDocument()
  })

  it('renders the search input', async () => {
    await renderPage()
    expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument()
  })
})
