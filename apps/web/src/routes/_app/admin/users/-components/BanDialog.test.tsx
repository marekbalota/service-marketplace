import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BanDialog } from './BanDialog'

function renderDialog(props: Partial<React.ComponentProps<typeof BanDialog>> = {}) {
  return render(
    <BanDialog
      open={true}
      userName="John Smith"
      onSubmit={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  )
}

describe('BanDialog', () => {
  it('renders the user name in the title', () => {
    renderDialog()
    expect(screen.getByText(/ban john smith/i)).toBeInTheDocument()
  })

  it('shows a validation error when submitting without a reason', async () => {
    renderDialog()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ban user/i }))
    })
    await waitFor(() => {
      expect(screen.getByText(/reason is required/i)).toBeInTheDocument()
    })
  })

  it('calls onSubmit with reason and no expiry for permanent ban', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onSubmit })
    fireEvent.change(screen.getByPlaceholderText(/describe the reason/i), {
      target: { value: 'Spamming' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ban user/i }))
    })
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Spamming', undefined)
    })
  })

  it('calls onClose when the Cancel button is clicked', () => {
    const onClose = vi.fn()
    renderDialog({ onClose })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows the expiry date input when "Until date" is selected', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => expect(screen.getByText('Until date')).toBeInTheDocument())
    await user.click(screen.getByText('Until date'))
    await waitFor(() => {
      expect(screen.queryByText(/expiry date/i)).not.toBeNull()
    })
  })
})
