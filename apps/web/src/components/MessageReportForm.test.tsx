import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MessageReportForm } from './MessageReportForm'

const mockReportsPost = vi.hoisted(() => vi.fn())
const mockCategoriesGet = vi.hoisted(() => vi.fn())

const SPAM_UUID = 'a1b2c3d4-e5f6-4789-8abc-def012345678'
const HARASSMENT_UUID = 'b2c3d4e5-f6a7-489a-9bcd-ef0123456789'

const MOCK_MESSAGE_CATEGORIES = [
  { categoryId: SPAM_UUID, targetType: 'MESSAGE', value: 'spam', label: 'Spam' },
  { categoryId: HARASSMENT_UUID, targetType: 'MESSAGE', value: 'harassment', label: 'Harassment or Bullying' },
]

vi.mock('#/api', () => ({
  api: {
    'report-categories': { get: mockCategoriesGet },
    threads: () => ({
      messages: () => ({
        reports: {
          post: mockReportsPost,
        },
      }),
    }),
  },
}))

function renderForm(props: { onSuccess?: () => void; onCancel?: () => void } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const onSuccess = props.onSuccess ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <MessageReportForm threadId="thread-1" messageId="msg-1" onSuccess={onSuccess} onCancel={onCancel} />
    </QueryClientProvider>,
  )
  return { onSuccess, onCancel }
}

describe('MessageReportForm', () => {
  beforeEach(() => {
    mockReportsPost.mockReset()
    mockCategoriesGet.mockResolvedValue({ data: MOCK_MESSAGE_CATEGORIES, error: null })
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

    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled())
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Spam')).toBeInTheDocument())
    await user.click(screen.getByText('Spam'))
    fireEvent.change(screen.getByPlaceholderText(/additional details/i), {
      target: { value: 'This message is spam.' },
    })
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockReportsPost).toHaveBeenCalledWith({ categoryId: SPAM_UUID, description: 'This message is spam.' })
  })

  it('shows already-reported message on 409 error', async () => {
    mockReportsPost.mockResolvedValue({ data: null, error: { status: 409 } })
    const user = userEvent.setup()
    renderForm()

    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled())
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Harassment or Bullying')).toBeInTheDocument())
    await user.click(screen.getByText('Harassment or Bullying'))
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => {
      expect(screen.getByText('You have already reported this message')).toBeInTheDocument()
    })
  })
})
