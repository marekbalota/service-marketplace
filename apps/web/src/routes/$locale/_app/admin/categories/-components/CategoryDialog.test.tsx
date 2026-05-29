import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CategoryDialog } from './CategoryDialog'

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

  it('submit button is disabled when name is empty', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('populates defaultValues when editing', () => {
    renderDialog({
      title: 'Rename Category',
      submitLabel: 'Save Changes',
      defaultValues: { name: 'Plumbing' },
    })
    expect(
      (screen.getByRole('textbox', { name: /category name/i }) as HTMLInputElement).value,
    ).toBe('Plumbing')
  })

  it('calls onSubmit with form values when submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onSubmit })

    fireEvent.change(screen.getByRole('textbox', { name: /category name/i }), {
      target: { value: 'Gardening' },
    })

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gardening' }))
    })
  })
})
