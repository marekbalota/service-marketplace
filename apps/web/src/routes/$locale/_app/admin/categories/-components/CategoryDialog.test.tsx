import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CategoryDialog } from './CategoryDialog'
import { ApiError } from '#/lib/api-error'

const noop = vi.fn().mockResolvedValue(undefined)

function renderDialog(props?: Partial<React.ComponentProps<typeof CategoryDialog>>) {
  return render(
    <CategoryDialog
      open={true}
      onOpenChange={vi.fn()}
      title="Create Category"
      description="Add a new category"
      submitLabel="Create"
      onSubmit={noop}
      {...props}
    />,
  )
}

describe('CategoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    noop.mockResolvedValue(undefined)
  })

  it('renders EN, SK, CS tabs', () => {
    renderDialog()
    expect(screen.getByRole('tab', { name: /EN/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /SK/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /CS/i })).toBeInTheDocument()
  })

  it('submit button is disabled when EN field is empty', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('submit button is enabled when EN field has a value', async () => {
    renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: /EN/i }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Gardening' } })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create/i })).not.toBeDisabled()
    })
  })

  it('populates EN tab when defaultValues provided', () => {
    renderDialog({
      defaultValues: { translations: { en: 'Plumbing', sk: 'Inštalatérstvo', cs: '' } },
    })
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Plumbing')
  })

  it('switches to SK tab and shows its value', () => {
    renderDialog({
      defaultValues: { translations: { en: 'Plumbing', sk: 'Inštalatérstvo', cs: '' } },
    })
    fireEvent.click(screen.getByRole('tab', { name: /SK/i }))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Inštalatérstvo')
  })

  it('calls onSubmit with translations array (omitting empty)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onSubmit })

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Gardening' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        translations: [{ locale: 'en', name: 'Gardening' }],
      })
    })
  })

  it('shows root error when generic error is thrown', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('generic'))
    renderDialog({ onSubmit })

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Gardening' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  it('shows conflict error on the EN field when 409 with locale is returned', async () => {
    const conflictError = new ApiError('Conflict', undefined, 409, 'en')
    const onSubmit = vi.fn().mockRejectedValue(conflictError)
    renderDialog({ onSubmit })

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Tutoring' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByText(/A category with this name already exists/i)).toBeInTheDocument()
    })
  })

  it('shows root conflict error when 409 has no locale', async () => {
    const conflictError = new ApiError('Conflict', undefined, 409)
    const onSubmit = vi.fn().mockRejectedValue(conflictError)
    renderDialog({ onSubmit })

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Tutoring' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByText(/A category with this name already exists/i)).toBeInTheDocument()
    })
  })
})
