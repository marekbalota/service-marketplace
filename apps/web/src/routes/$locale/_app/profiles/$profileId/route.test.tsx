import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useParams: vi.fn(() => ({ profileId: 'profile-1' })),
    useRouter: vi.fn(() => ({ history: { back: vi.fn() } })),
    useSearch: vi.fn(() => ({ tab: undefined, page: undefined })),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

vi.mock('#/lib/queries/profiles', () => ({
  profileQueryOptions: (id: string) => ({ queryKey: ['profiles', id] }),
  imagesQueryOptions: (id: string) => ({ queryKey: ['profiles', id, 'images'] }),
  profileLocationsQueryOptions: (id: string) => ({ queryKey: ['locations', 'profile', id] }),
  profilePostsQueryOptions: (id: string, page: number, archived: boolean, pageSize = 12) => ({
    queryKey: ['profiles', id, 'posts', { page, archived, pageSize }],
  }),
  profilePostsCountQueryOptions: (id: string) => ({ queryKey: ['profiles', id, 'posts', 'count'] }),
}))

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profile = {
  userProfileId: 'profile-1',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  bio: 'Software engineer',
  phoneNumber: '+1 555 0001',
  fax: '+1 555 0002',
  createdAt: new Date('2024-01-01'),
  updatedAt: null,
  averageRating: 4.5,
}

// ── Render helper ─────────────────────────────────────────────────────────────

import { Route } from './route'

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfileViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSuspenseQuery.mockImplementation((opts: { queryKey: unknown[] }) => {
      const key = opts.queryKey
      if (Array.isArray(key) && key[0] === 'profiles' && key[2] === 'posts') {
        return { data: { items: [], totalPages: 1, total: 0 } }
      }
      return { data: profile }
    })
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as unknown as ReturnType<
      typeof useCurrentUser
    >)
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: null } as ReturnType<
      typeof useActiveProfile
    >)
  })

  it('renders the profile name as page heading', async () => {
    await renderPage()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
  })

  it('renders the Bio label', async () => {
    await renderPage()
    expect(screen.getByText('Bio')).toBeInTheDocument()
  })

  it('renders member since date in subtitle area', async () => {
    await renderPage()
    expect(screen.getByText(/member since/i)).toBeInTheDocument()
  })

  it('renders the email', async () => {
    await renderPage()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('renders the phone number', async () => {
    await renderPage()
    expect(screen.getByText('+1 555 0001')).toBeInTheDocument()
  })

  it('renders the fax when present', async () => {
    await renderPage()
    expect(screen.getByText('+1 555 0002')).toBeInTheDocument()
  })

  it('renders the bio', async () => {
    await renderPage()
    expect(screen.getByText('Software engineer')).toBeInTheDocument()
  })

  it('renders the average rating when present', async () => {
    await renderPage()
    expect(screen.getByText('4.5 / 5.0')).toBeInTheDocument()
  })

  it('renders a Back button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('shows "sign in" message for unauthenticated visitors', async () => {
    await renderPage()
    expect(screen.getByText(/sign in to view/i)).toBeInTheDocument()
  })

  it('shows Active and Archived tabs for authenticated users', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'other-user' },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'other-profile', name: 'Bob', email: 'bob@example.com' },
    } as ReturnType<typeof useActiveProfile>)
    await renderPage()
    expect(screen.getByRole('tab', { name: /active/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /archived/i })).toBeInTheDocument()
  })

  it('renders posts heading for authenticated user', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'some-user' },
    } as unknown as ReturnType<typeof useCurrentUser>)
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'other-profile', name: 'Bob', email: 'bob@example.com' },
    } as ReturnType<typeof useActiveProfile>)
    await renderPage()
    expect(screen.getByRole('heading', { name: /posts/i })).toBeInTheDocument()
  })
})
