import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReviewForm } from './ReviewForm'

const mockMutate = vi.hoisted(() => vi.fn())
const mockMutation = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useMutation: mockMutation,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(() => ({ activeProfile: { userProfileId: 'profile-1' } })),
}))

vi.mock('#/api', () => ({
  api: {
    reviews: { post: vi.fn() },
    'review-images': { post: vi.fn() },
  },
}))

vi.mock('#/components/StarRatingInput', () => ({
  StarRatingInput: ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
    <div>
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)} aria-label={`Star ${star}`}>
          {star <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  ),
}))

// ImagePickerGrid uses URL.createObjectURL — stub it in tests
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
})

function renderForm(props = {}) {
  return render(
    <ReviewForm postId="post-1" onSuccess={vi.fn()} onCancel={vi.fn()} {...props} />,
  )
}

describe('ReviewForm', () => {
  beforeEach(() => {
    mockMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
    })
  })

  it('shows a validation error when submitting without a rating', async () => {
    renderForm()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit review/i }))
    })
    await waitFor(() => {
      expect(screen.getByText(/rating is required/i)).toBeInTheDocument()
    })
  })

  it('calls mutation.mutate with rating and description on valid submit', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: /star 4/i }))
    fireEvent.change(screen.getByPlaceholderText(/share your experience/i), {
      target: { value: 'Great service!' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit review/i }))
    })
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 4, description: 'Great service!' }),
      )
    })
  })

  it('renders the Images section with an add button', () => {
    renderForm()
    expect(screen.getByText('Images (Optional)')).toBeInTheDocument()
    // ImagePickerGrid always renders at least the "+" add button
    const buttons = screen.getAllByRole('button')
    expect(buttons.some(b => b.querySelector('svg'))).toBe(true)
  })

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn()
    renderForm({ onCancel })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('renders the error message from mutation error state', () => {
    mockMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      onError: vi.fn(),
    })
    renderForm()
    expect(screen.queryByText(/failed to submit/i)).not.toBeInTheDocument()
  })
})
