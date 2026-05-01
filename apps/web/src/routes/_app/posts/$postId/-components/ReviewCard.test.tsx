import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewCard, type ReviewType } from './ReviewCard'
import type { UserProfile } from '#/types/api'

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(),
}))

vi.mock('../-queries/posts', () => ({
  hasReportedReviewQueryOptions: vi.fn(() => ({ queryKey: ['test-noop'], queryFn: async () => false })),
}))

import { useActiveProfile } from '#/context/activeProfile'

function renderCard(props: React.ComponentProps<typeof ReviewCard>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReviewCard {...props} />
    </QueryClientProvider>,
  )
}

const baseReview: ReviewType = {
  reviewId: 'rev-1',
  reviewerName: 'Jane Doe',
  createdAt: new Date('2024-03-01'),
  rating: 4,
  reviewDescription: 'Great service!',
  reviewerId: 'profile-reviewer',
}

describe('ReviewCard', () => {
  beforeEach(() => {
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: null, setActiveProfileId: vi.fn() })
  })

  it('renders the reviewer name', () => {
    renderCard({
      review: baseReview,
      onDelete: vi.fn(),
      isDeleting: false,
      onReport: vi.fn(),
      isAuthenticated: false,
    })
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders 4 filled stars for a rating of 4', () => {
    renderCard({
      review: baseReview,
      onDelete: vi.fn(),
      isDeleting: false,
      onReport: vi.fn(),
      isAuthenticated: false,
    })
    const stars = document.querySelectorAll('svg')
    const filledStars = Array.from(stars).filter(s => s.classList.contains('fill-star-filled'))
    expect(filledStars).toHaveLength(4)
  })

  it('renders the review description', () => {
    renderCard({
      review: baseReview,
      onDelete: vi.fn(),
      isDeleting: false,
      onReport: vi.fn(),
      isAuthenticated: false,
    })
    expect(screen.getByText('Great service!')).toBeInTheDocument()
  })

  it('shows the delete button when active profile matches reviewerId', () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'profile-reviewer' } as UserProfile,
      setActiveProfileId: vi.fn(),
    })
    renderCard({
      review: baseReview,
      onDelete: vi.fn(),
      isDeleting: false,
      onReport: vi.fn(),
      isAuthenticated: true,
    })
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('calls onDelete with the reviewId when delete button is clicked', () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'profile-reviewer' } as UserProfile,
      setActiveProfileId: vi.fn(),
    })
    const onDelete = vi.fn()
    renderCard({
      review: baseReview,
      onDelete,
      isDeleting: false,
      onReport: vi.fn(),
      isAuthenticated: true,
    })
    const deleteButton = screen.getAllByRole('button').find(
      btn => btn.querySelector('svg') !== null && btn.classList.contains('text-destructive'),
    )!
    fireEvent.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith('rev-1')
  })

  it('does not show the delete button when active profile does not match reviewerId', () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'other-profile' } as UserProfile,
      setActiveProfileId: vi.fn(),
    })
    renderCard({
      review: baseReview,
      onDelete: vi.fn(),
      isDeleting: false,
      onReport: vi.fn(),
      isAuthenticated: true,
    })
    const buttons = screen.getAllByRole('button')
    const deleteButton = buttons.find(btn => btn.classList.contains('text-destructive'))
    expect(deleteButton).toBeUndefined()
  })

  it('shows the report button when isAuthenticated and not own review', () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'other-profile' } as UserProfile,
      setActiveProfileId: vi.fn(),
    })
    renderCard({
      review: baseReview,
      onDelete: vi.fn(),
      isDeleting: false,
      onReport: vi.fn(),
      isAuthenticated: true,
    })
    expect(screen.getByRole('button', { name: /report review/i })).toBeInTheDocument()
  })

  it('calls onReport with the reviewId when report button is clicked', () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'other-profile' } as UserProfile,
      setActiveProfileId: vi.fn(),
    })
    const onReport = vi.fn()
    renderCard({
      review: baseReview,
      onDelete: vi.fn(),
      isDeleting: false,
      onReport,
      isAuthenticated: true,
    })
    fireEvent.click(screen.getByRole('button', { name: /report review/i }))
    expect(onReport).toHaveBeenCalledWith('rev-1')
  })

  it('does not show the report button when not authenticated', () => {
    renderCard({
      review: baseReview,
      onDelete: vi.fn(),
      isDeleting: false,
      onReport: vi.fn(),
      isAuthenticated: false,
    })
    expect(screen.queryByRole('button', { name: /report review/i })).not.toBeInTheDocument()
  })
})
