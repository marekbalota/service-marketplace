import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './index'
import { useCurrentUser } from '#/lib/queries/users'

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useParams: vi.fn(() => ({ userId: 'user-1', profileId: 'profile-1' })),
    useSearch: vi.fn(() => ({})),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useQuery: vi.fn(() => ({ data: undefined })),
  }
})

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('#/api', () => ({
  api: {
    admin: {
      posts: vi.fn(() => ({ delete: vi.fn().mockResolvedValue({ error: null }) })),
    },
  },
}))

const baseProfile = {
  userProfileId: 'profile-1',
  name: 'Alice Profile',
  email: 'alice-profile@example.com',
  bio: 'Test bio',
  phoneNumber: null,
  fax: null,
  createdAt: new Date().toISOString(),
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

const basePost = {
  postId: 'post-1',
  postTitle: 'My Test Post',
  description: 'Test description',
  postType: 'OFFER',
  categories: [],
  price: null,
  rateType: null,
  location: null,
  authorId: 'profile-1',
  authorName: 'Alice Profile',
  createdAt: new Date().toISOString(),
  reviewCount: 0,
  averageRating: null,
}

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />, { wrapper })
  })
}

describe('ProfileDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: [] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      const key = opts.queryKey
      if (Array.isArray(key) && key[0] === 'profiles' && key[2] === 'posts') {
        return { data: { items: [], totalPages: 1, total: 0 } }
      }
      if (Array.isArray(key) && key[0] === 'profiles') {
        return { data: baseProfile }
      }
      return { data: { items: [], totalPages: 1, total: 0 } }
    })
  })

  it('renders Back to User button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /back to user/i })).toBeInTheDocument()
  })

  it('shows profile name and email', async () => {
    await renderPage()
    expect(screen.getByText('Alice Profile')).toBeInTheDocument()
    expect(screen.getByText('alice-profile@example.com')).toBeInTheDocument()
  })

  it('shows Active and Archived tabs', async () => {
    await renderPage()
    expect(screen.getByRole('tab', { name: /active/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /archived/i })).toBeInTheDocument()
  })

  it('shows empty state when active tab has no posts', async () => {
    await renderPage()
    expect(screen.getByText(/no active posts/i)).toBeInTheDocument()
  })

  it('shows post cards when posts are present', async () => {
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      const key = opts.queryKey
      if (Array.isArray(key) && key[0] === 'profiles' && key[2] === 'posts') {
        return { data: { items: [basePost], totalPages: 1, total: 1 } }
      }
      return { data: baseProfile }
    })
    await renderPage()
    expect(screen.getByText('My Test Post')).toBeInTheDocument()
  })

  it('shows Delete button on post cards when user has AdminPostsDeleteAny permission', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:posts:delete:any'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      const key = opts.queryKey
      if (Array.isArray(key) && key[0] === 'profiles' && key[2] === 'posts') {
        return { data: { items: [basePost], totalPages: 1, total: 1 } }
      }
      return { data: baseProfile }
    })
    await renderPage()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('opens the confirm dialog when Delete is clicked', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { permissions: ['admin:posts:delete:any'] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      const key = opts.queryKey
      if (Array.isArray(key) && key[0] === 'profiles' && key[2] === 'posts') {
        return { data: { items: [basePost], totalPages: 1, total: 1 } }
      }
      return { data: baseProfile }
    })
    await renderPage()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ban Post' })).toBeInTheDocument()
    })
  })
})
