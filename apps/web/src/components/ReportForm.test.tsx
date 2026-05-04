import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReportForm } from './ReportForm'

const mockOnReport = vi.hoisted(() => vi.fn())
const mockCategoriesGet = vi.hoisted(() => vi.fn())

const SPAM_UUID = 'a1b2c3d4-e5f6-4789-8abc-def012345678'
const FAKE_UUID = 'b2c3d4e5-f6a7-489a-9bcd-ef0123456789'

const MOCK_CATEGORIES = [
  { categoryId: SPAM_UUID, targetType: 'POST', value: 'spam', label: 'Spam' },
  { categoryId: FAKE_UUID, targetType: 'POST', value: 'fake', label: 'Fake Content' },
]

vi.mock('#/api', () => ({
  api: { 'report-categories': { get: mockCategoriesGet } },
}))

function renderForm(props: Partial<Parameters<typeof ReportForm>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const onSuccess = props.onSuccess ?? vi.fn()
  const onCancel = props.onCancel ?? vi.fn()
  render(
    <QueryClientProvider client={qc}>
      <ReportForm
        targetType={props.targetType ?? 'POST'}
        entityName={props.entityName ?? 'post'}
        descriptionRequired={props.descriptionRequired ?? false}
        onReport={props.onReport ?? mockOnReport}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </QueryClientProvider>,
  )
  return { onSuccess, onCancel }
}

describe('ReportForm', () => {
  beforeEach(() => {
    mockOnReport.mockReset()
    mockCategoriesGet.mockResolvedValue({ data: MOCK_CATEGORIES, error: null })
  })

  it('renders category select, description textarea, and action buttons', () => {
    renderForm()
    expect(screen.getByText('Report Category *')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit report/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('marks description as required when descriptionRequired is true', () => {
    renderForm({ descriptionRequired: true })
    expect(screen.getByText('Description *')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderForm()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not submit without selecting a category', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: /submit report/i }))
    await waitFor(() => expect(mockOnReport).not.toHaveBeenCalled())
  })

  it('shows a validation error when description is required but empty', async () => {
    const user = userEvent.setup()
    renderForm({ descriptionRequired: true })
    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled())
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Spam')).toBeInTheDocument())
    await user.click(screen.getByText('Spam'))
    await user.click(screen.getByRole('button', { name: /submit report/i }))
    await waitFor(() => expect(screen.getByText('Description is required')).toBeInTheDocument())
    expect(mockOnReport).not.toHaveBeenCalled()
  })

  it('calls onReport and onSuccess when submitted with optional description', async () => {
    mockOnReport.mockResolvedValue(undefined)
    const user = userEvent.setup()
    const { onSuccess } = renderForm({ entityName: 'message' })

    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled())
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Spam')).toBeInTheDocument())
    await user.click(screen.getByText('Spam'))
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockOnReport).toHaveBeenCalledWith({ categoryId: SPAM_UUID, description: '' })
  })

  it('calls onReport and onSuccess when submitted with required description', async () => {
    mockOnReport.mockResolvedValue(undefined)
    const user = userEvent.setup()
    const { onSuccess } = renderForm({ descriptionRequired: true })

    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled())
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Fake Content')).toBeInTheDocument())
    await user.click(screen.getByText('Fake Content'))
    fireEvent.change(screen.getByPlaceholderText(/additional details/i), {
      target: { value: 'This is problematic.' },
    })
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(mockOnReport).toHaveBeenCalledWith({ categoryId: FAKE_UUID, description: 'This is problematic.' })
  })

  it('shows already-reported message from server on 409', async () => {
    mockOnReport.mockRejectedValue({ status: 409, value: { message: 'You have already reported this review' } })
    const user = userEvent.setup()
    renderForm({ entityName: 'review' })

    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled())
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Spam')).toBeInTheDocument())
    await user.click(screen.getByText('Spam'))
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    await waitFor(() =>
      expect(screen.getByText('You have already reported this review')).toBeInTheDocument(),
    )
  })
})
