import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { PostReviewsCard } from './PostReviewsCard'

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useQuery: vi.fn(() => ({ data: undefined })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
  }
})

vi.mock('#/lib/queries/users', () => ({ useCurrentUser: vi.fn() }))
vi.mock('#/context/activeProfile', () => ({ useActiveProfile: vi.fn() }))
vi.mock('#/api', () => ({
  api: {
    reviews: vi.fn(() => ({ delete: vi.fn(), reports: { post: vi.fn() } })),
    profiles: vi.fn(() => ({ reported: { reviews: vi.fn(() => ({ get: vi.fn() })) } })),
  },
}))
vi.mock('./ReviewCard', () => ({
  ReviewCard: ({ review }: { review: { reviewerName: string } }) => (
    <div data-testid="review-card">{review.reviewerName}</div>
  ),
}))
vi.mock('./ReviewForm', () => ({
  ReviewForm: () => <div data-testid="review-form" />,
}))

const basePost = {
  postId: 'post-1',
  postTitle: 'Lawn Care Service',
  description: '',
  postType: 'OFFER',
  categories: [],
  price: null,
  rateType: null,
  location: null,
  authorId: 'profile-author',
  authorName: 'Bob',
  reviews: [],
  reviewCount: 0,
  averageRating: null,
}

describe('PostReviewsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSuspenseQuery.mockReturnValue({ data: basePost })
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as unknown as ReturnType<
      typeof useCurrentUser
    >)
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: null } as ReturnType<
      typeof useActiveProfile
    >)
  })

  it('renders review cards for each review', async () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: {
        ...basePost,
        reviewCount: 2,
        reviews: [
          {
            reviewId: 'r1',
            reviewerName: 'Alice',
            createdAt: new Date(),
            rating: 5,
            reviewDescription: null,
            reviewerId: 'p-alice',
          },
          {
            reviewId: 'r2',
            reviewerName: 'Charlie',
            createdAt: new Date(),
            rating: 3,
            reviewDescription: null,
            reviewerId: 'p-charlie',
          },
        ],
      },
    })
    await act(async () => render(<PostReviewsCard postId="post-1" />))
    expect(screen.getAllByTestId('review-card')).toHaveLength(2)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows Leave a Review button for non-owner who has not reviewed', async () => {
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
    await act(async () => render(<PostReviewsCard postId="post-1" />))
    expect(screen.getByRole('button', { name: /leave a review/i })).toBeInTheDocument()
  })

  it('does not show Leave a Review button for the post owner', async () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'profile-author', name: 'Bob', email: 'bob@example.com' },
    } as ReturnType<typeof useActiveProfile>)
    vi.mocked(useCurrentUser).mockReturnValue({ data: { userId: 'u1' } } as unknown as ReturnType<
      typeof useCurrentUser
    >)
    await act(async () => render(<PostReviewsCard postId="post-1" />))
    expect(screen.queryByRole('button', { name: /leave a review/i })).not.toBeInTheDocument()
  })

  it('shows already reviewed message when the user has a review', async () => {
    const profileId = 'profile-visitor'
    mockUseSuspenseQuery.mockReturnValue({
      data: {
        ...basePost,
        reviewCount: 1,
        reviews: [
          {
            reviewId: 'r1',
            reviewerName: 'Alice',
            createdAt: new Date(),
            rating: 4,
            reviewDescription: null,
            reviewerId: profileId,
          },
        ],
      },
    })
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: profileId, name: 'Alice', email: 'alice@example.com' },
    } as ReturnType<typeof useActiveProfile>)
    vi.mocked(useCurrentUser).mockReturnValue({ data: { userId: 'u2' } } as unknown as ReturnType<
      typeof useCurrentUser
    >)
    await act(async () => render(<PostReviewsCard postId="post-1" />))
    expect(screen.getByText(/already reviewed/i)).toBeInTheDocument()
  })
})
