import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReviewReportForm } from './ReviewReportForm'

const mockReportsPost = vi.hoisted(() => vi.fn())

vi.mock('#/api', () => ({
  api: {
    reviews: () => ({
      reports: {
        post: mockReportsPost,
      },
    }),
  },
}))

function renderForm(props: { onSuccess?: () => void; onCancel?: () => void } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const onSuccess = props.onSuccess ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <ReviewReportForm reviewId="rev-1" onSuccess={onSuccess} onCancel={onCancel} />
    </QueryClientProvider>,
  )
  return { onSuccess, onCancel }
}

describe('ReviewReportForm', () => {
  beforeEach(() => {
    mockReportsPost.mockReset()
  })

  it('renders category select, description textarea, and action buttons', () => {
    renderForm()
    expect(screen.getByText('Report Category *')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit report/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ onCancel })
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not submit without selecting a reason', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: /submit report/i }))
    await waitFor(() => {
      expect(mockReportsPost).not.toHaveBeenCalled()
    })
  })

  it('calls the API and onSuccess when submitted with valid data', async () => {
    mockReportsPost.mockResolvedValue({ data: { reportId: 'r1' }, error: null })
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    renderForm({ onSuccess })

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Fake Review'))
    fireEvent.change(screen.getByPlaceholderText(/additional details/i), {
      target: { value: 'This review is fake.' },
    })
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockReportsPost).toHaveBeenCalledWith({ reason: 'fake-review', description: 'This review is fake.' })
  })

  it('shows already-reported message on 409 error', async () => {
    mockReportsPost.mockResolvedValue({ data: null, error: { status: 409 } })
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('Spam'))
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => {
      expect(screen.getByText('You have already reported this review')).toBeInTheDocument()
    })
  })
})
