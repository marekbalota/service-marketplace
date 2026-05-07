import { render, screen, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './route'

const mockHistoryBack = vi.fn()
const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useParams: vi.fn(() => ({ postId: 'post-1' })),
    useRouter: vi.fn(() => ({ history: { back: mockHistoryBack } })),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/api', () => ({
  api: {
    posts: vi.fn(() => ({ patch: vi.fn().mockResolvedValue({ data: {}, error: null }), get: vi.fn() })),
  },
}))

vi.mock('#/lib/api-error', () => ({
  wrapEdenError: vi.fn((err: unknown) => err),
}))

const basePost = {
  postId: 'post-1',
  postTitle: 'Lawn Care Service',
  description: 'Professional lawn care with attention to detail.',
  postType: 'OFFER',
  categories: [{ categoryId: 'cat-1', name: 'Gardening' }],
  price: '50.00',
  rateType: 'HOURLY',
  location: null,
  authorId: 'profile-author',
  authorName: 'Bob',
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

describe('EditPostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Route, 'useParams').mockReturnValue({ postId: 'post-1' })
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      if (opts.queryKey[0] === 'posts') return { data: basePost }
      return { data: [] }
    })
  })

  it('pre-fills the form with the existing post title', async () => {
    await renderPage()
    expect(screen.getByDisplayValue('Lawn Care Service')).toBeInTheDocument()
  })

  it('pre-fills the form with the existing description', async () => {
    await renderPage()
    expect(screen.getByDisplayValue('Professional lawn care with attention to detail.')).toBeInTheDocument()
  })

  it('renders "Edit Posting" card title', async () => {
    await renderPage()
    expect(screen.getByText('Edit Posting')).toBeInTheDocument()
  })

  it('renders Save Changes and Cancel buttons', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('Cancel goes back in history', async () => {
    await renderPage()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    })
    expect(mockHistoryBack).toHaveBeenCalled()
  })
})
