import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './route'
import { useCurrentUser } from '#/lib/queries/users'

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useParams: vi.fn(() => ({ postId: 'post-1' })),
    useRouter: vi.fn(() => ({ history: { back: vi.fn() } })),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false })),
  }
})

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(() => ({ activeProfile: null })),
}))

vi.mock('#/api', () => ({
  api: {
    reviews: vi.fn(() => ({ delete: vi.fn(), reports: { post: vi.fn() } })),
    posts: vi.fn(() => ({ reports: { post: vi.fn() } })),
    profiles: vi.fn(() => ({ reported: { posts: vi.fn(() => ({ get: vi.fn() })) } })),
  },
}))

vi.mock('./-components/SendMessageSection', () => ({
  SendMessageSection: () => <div data-testid="send-message-section" />,
}))

const basePost = {
  postId: 'post-1',
  postTitle: 'Expert Lawn Care Service',
  description: 'Professional lawn care for your garden.',
  postType: 'OFFER',
  categories: [{ categoryId: 'cat-1', name: 'Gardening' }],
  price: '50.00',
  rateType: 'HOURLY',
  location: null,
  authorId: 'profile-author',
  authorName: 'Bob',
  createdAt: new Date().toISOString(),
  reviews: [],
  reviewCount: 0,
  averageRating: null,
}

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('PostDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSuspenseQuery.mockReturnValue({ data: basePost })
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as unknown as ReturnType<
      typeof useCurrentUser
    >)
  })

  it('renders the post title', async () => {
    await renderPage()
    expect(
      screen.getByRole('heading', { level: 1, name: /expert lawn care service/i }),
    ).toBeInTheDocument()
  })

  it('renders the Description section', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { level: 2, name: /description/i })).toBeInTheDocument()
    expect(screen.getByText('Professional lawn care for your garden.')).toBeInTheDocument()
  })

  it('renders the Posted by author link', async () => {
    await renderPage()
    expect(screen.getByText(/posted by/i)).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('renders the category badge', async () => {
    await renderPage()
    expect(screen.getByText('Gardening')).toBeInTheDocument()
  })

  it('renders the price', async () => {
    await renderPage()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('shows Edit button when active profile is the post owner', async () => {
    const { useActiveProfile } = await import('#/context/activeProfile')
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'profile-author', name: 'Bob', email: 'bob@example.com' },
    } as ReturnType<typeof useActiveProfile>)
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1' },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument()
  })

  it('does not show Edit button for non-owner', async () => {
    const { useActiveProfile } = await import('#/context/activeProfile')
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: {
        userProfileId: 'profile-visitor',
        name: 'Alice',
        email: 'alice@example.com',
      },
    } as ReturnType<typeof useActiveProfile>)
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1' },
    } as unknown as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows empty state when there are no reviews', async () => {
    await renderPage()
    expect(screen.getByText('No reviews yet.')).toBeInTheDocument()
  })
})
