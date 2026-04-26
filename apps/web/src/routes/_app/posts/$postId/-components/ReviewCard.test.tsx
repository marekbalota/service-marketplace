import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ReviewCard, type ReviewType } from './ReviewCard'

const baseReview: ReviewType = {
  reviewId: 'rev-1',
  reviewerName: 'Jane Doe',
  createdAt: new Date('2024-03-01'),
  rating: 4,
  reviewDescription: 'Great service!',
  reviewerId: 'profile-reviewer',
}

describe('ReviewCard', () => {
  it('renders the reviewer name', () => {
    render(
      <ReviewCard
        review={baseReview}
        myProfileId={null}
        onDelete={vi.fn()}
        isDeleting={false}
        onReport={vi.fn()}
        isAuthenticated={false}
      />
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders 4 filled stars for a rating of 4', () => {
    render(
      <ReviewCard
        review={baseReview}
        myProfileId={null}
        onDelete={vi.fn()}
        isDeleting={false}
        onReport={vi.fn()}
        isAuthenticated={false}
      />
    )
    const stars = document.querySelectorAll('svg')
    const filledStars = Array.from(stars).filter(s => s.classList.contains('fill-star-filled'))
    expect(filledStars).toHaveLength(4)
  })

  it('renders the review description', () => {
    render(
      <ReviewCard
        review={baseReview}
        myProfileId={null}
        onDelete={vi.fn()}
        isDeleting={false}
        onReport={vi.fn()}
        isAuthenticated={false}
      />
    )
    expect(screen.getByText('Great service!')).toBeInTheDocument()
  })

  it('shows the delete button when myProfileId matches reviewerId', () => {
    render(
      <ReviewCard
        review={baseReview}
        myProfileId="profile-reviewer"
        onDelete={vi.fn()}
        isDeleting={false}
        onReport={vi.fn()}
        isAuthenticated={true}
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('calls onDelete with the reviewId when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(
      <ReviewCard
        review={baseReview}
        myProfileId="profile-reviewer"
        onDelete={onDelete}
        isDeleting={false}
        onReport={vi.fn()}
        isAuthenticated={true}
      />
    )
    const deleteButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('svg') !== null && btn.classList.contains('text-destructive')
    )!
    fireEvent.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith('rev-1')
  })

  it('does not show the delete button when myProfileId does not match reviewerId', () => {
    render(
      <ReviewCard
        review={baseReview}
        myProfileId="other-profile"
        onDelete={vi.fn()}
        isDeleting={false}
        onReport={vi.fn()}
        isAuthenticated={true}
      />
    )
    const buttons = screen.getAllByRole('button')
    const deleteButton = buttons.find(btn => btn.classList.contains('text-destructive'))
    expect(deleteButton).toBeUndefined()
  })

  it('shows the report button when isAuthenticated and not own review', () => {
    render(
      <ReviewCard
        review={baseReview}
        myProfileId="other-profile"
        onDelete={vi.fn()}
        isDeleting={false}
        onReport={vi.fn()}
        isAuthenticated={true}
      />
    )
    expect(screen.getByRole('button', { name: /report review/i })).toBeInTheDocument()
  })

  it('calls onReport with the reviewId when report button is clicked', () => {
    const onReport = vi.fn()
    render(
      <ReviewCard
        review={baseReview}
        myProfileId="other-profile"
        onDelete={vi.fn()}
        isDeleting={false}
        onReport={onReport}
        isAuthenticated={true}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /report review/i }))
    expect(onReport).toHaveBeenCalledWith('rev-1')
  })

  it('does not show the report button when not authenticated', () => {
    render(
      <ReviewCard
        review={baseReview}
        myProfileId={null}
        onDelete={vi.fn()}
        isDeleting={false}
        onReport={vi.fn()}
        isAuthenticated={false}
      />
    )
    expect(screen.queryByRole('button', { name: /report review/i })).not.toBeInTheDocument()
  })
})
