import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { PostInfoCard } from './PostInfoCard'

const mockUseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: mockUseQuery,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to?: string }) => (
      <a href={to ?? '#'}>{children}</a>
    ),
  }
})

vi.mock('#/lib/queries/users', () => ({ useCurrentUser: vi.fn() }))
vi.mock('#/context/activeProfile', () => ({ useActiveProfile: vi.fn() }))
vi.mock('#/components/FavouriteButton', () => ({
  FavouriteButton: () => <button>Favourite</button>,
}))
vi.mock('#/api', () => ({
  api: {
    posts: vi.fn(() => ({ reports: { post: vi.fn() } })),
    profiles: vi.fn(() => ({ reported: { posts: vi.fn(() => ({ get: vi.fn() })) } })),
  },
}))

const basePost = {
  postId: 'post-1',
  postTitle: 'Lawn Care Service',
  description: 'Professional lawn care.',
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

describe('PostInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValueOnce({ data: basePost }).mockReturnValue({ data: undefined })
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as unknown as ReturnType<
      typeof useCurrentUser
    >)
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: null } as ReturnType<
      typeof useActiveProfile
    >)
  })

  it('shows Edit link for the post owner', async () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'profile-author', name: 'Bob', email: 'bob@example.com' },
    } as ReturnType<typeof useActiveProfile>)
    vi.mocked(useCurrentUser).mockReturnValue({ data: { userId: 'u1' } } as unknown as ReturnType<
      typeof useCurrentUser
    >)
    await act(async () => render(<PostInfoCard postId="post-1" />))
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument()
  })

  it('does not show Edit link for non-owner', async () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: {
        userProfileId: 'profile-visitor',
        name: 'Alice',
        email: 'alice@example.com',
      },
    } as ReturnType<typeof useActiveProfile>)
    vi.mocked(useCurrentUser).mockReturnValue({ data: { userId: 'u2' } } as unknown as ReturnType<
      typeof useCurrentUser
    >)
    await act(async () => render(<PostInfoCard postId="post-1" />))
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows Report post button for authenticated non-owner', async () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: {
        userProfileId: 'profile-visitor',
        name: 'Alice',
        email: 'alice@example.com',
      },
    } as ReturnType<typeof useActiveProfile>)
    vi.mocked(useCurrentUser).mockReturnValue({ data: { userId: 'u2' } } as unknown as ReturnType<
      typeof useCurrentUser
    >)
    await act(async () => render(<PostInfoCard postId="post-1" />))
    expect(screen.getByRole('button', { name: /report post/i })).toBeInTheDocument()
  })

  it('does not show Report post button for unauthenticated user', async () => {
    await act(async () => render(<PostInfoCard postId="post-1" />))
    expect(screen.queryByRole('button', { name: /report post/i })).not.toBeInTheDocument()
  })
})
