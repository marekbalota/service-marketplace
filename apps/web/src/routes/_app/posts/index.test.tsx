import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const mockUseSearch = vi.hoisted(() => vi.fn())
const mockUseNavigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => ({
      useSearch: mockUseSearch,
      useNavigate: mockUseNavigate,
      options,
    }),
  }
})

vi.mock('#/lib/queries/users', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
  useCurrentUser: vi.fn(),
}))

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(() => ({ activeProfile: null })),
}))

vi.mock('#/lib/queries/posts', () => ({
  categoriesQueryOptions: { queryKey: ['categories'], queryFn: async () => [] },
}))

vi.mock('./-queries/posts', () => ({
  postsQueryOptions: () => ({ queryKey: ['posts'], queryFn: async () => ({ items: [], total: 0 }) }),
  PAGE_SIZE: 12,
}))

vi.mock('./-components/PostsList', () => ({
  PostsList: () => <div data-testid="posts-list" />,
}))

vi.mock('#/components/SearchFilterBar', () => ({
  SearchFilterBar: ({ action, searchValue, onSearchChange, filters }: {
    action?: React.ReactNode
    searchValue: string
    onSearchChange: (v: string) => void
    filters?: Array<{ label: string; control: React.ReactNode }>
  }) => (
    <div>
      <input
        data-testid="search-input"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {action}
      {filters?.map((f, i) => <div key={i}>{f.control}</div>)}
    </div>
  ),
}))

vi.mock('./-components/PostTypeSelect', () => ({ PostTypeSelect: () => null }))
vi.mock('./-components/CategorySelect', () => ({ CategorySelect: () => null }))
vi.mock('./-components/SortSelect', () => ({ SortSelect: () => null }))
vi.mock('./-components/RatingSelect', () => ({ RatingSelect: () => null }))

vi.mock('@tanstack/react-pacer', () => ({
  useDebouncer: (_fn: unknown) => ({ maybeExecute: vi.fn() }),
}))

// ── Import after mocks ─────────────────────────────────────────────────────

import { Route } from './index'
import { useCurrentUser } from '#/lib/queries/users'

const defaultSearch = {
  q: '',
  type: 'all' as const,
  sort: 'newest' as const,
  page: 1,
  favourites: false,
  rating: undefined,
}

async function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(['categories'], [])
  qc.setQueryData(['posts'], { items: [], total: 0 })
  const component = (Route as any).options?.component
  const rootRoute = createRootRoute({ component })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory(), context: { queryClient: qc } })
  await act(async () => {
    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
  })
}

describe('HomePage', () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue(defaultSearch)
    mockUseNavigate.mockReturnValue(vi.fn())
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as ReturnType<typeof useCurrentUser>)
  })

  it('renders the search input', async () => {
    await renderPage()
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
  })

  it('does not show the New Post link when not authenticated', async () => {
    await renderPage()
    expect(screen.queryByRole('link', { name: /new post/i })).not.toBeInTheDocument()
  })

  it('shows the New Post link when authenticated', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', name: 'Alice', email: 'a@a.com', role: null, profiles: [] },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByRole('link', { name: /new post/i })).toBeInTheDocument()
  })

  it('does not show the Favourites button when not authenticated', async () => {
    await renderPage()
    expect(screen.queryByRole('button', { name: /favourites/i })).not.toBeInTheDocument()
  })

  it('shows the Show Favourites button when authenticated', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', name: 'Alice', email: 'a@a.com', role: null, profiles: [] },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByRole('button', { name: /show favourites/i })).toBeInTheDocument()
  })
})
