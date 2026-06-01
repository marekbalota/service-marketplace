import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BanDialog } from './BanDialog'

function renderDialog(props: Partial<React.ComponentProps<typeof BanDialog>> = {}) {
  return render(
    <BanDialog open={true} userName="John Smith" onSubmit={vi.fn()} onClose={vi.fn()} {...props} />,
  )
}

describe('BanDialog', () => {
  it('renders the user name in the title', () => {
    renderDialog()
    expect(screen.getByText(/ban john smith/i)).toBeInTheDocument()
  })

  it('shows a validation error when submitting without a reason', async () => {
    const user = userEvent.setup()
    renderDialog()
    // Touch the field by focusing and blurring
    await user.click(screen.getByPlaceholderText(/describe the reason/i))
    await user.tab()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ban user/i }))
    })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/this field is required/i)
    })
  })

  it('calls onSubmit with reason and no expiry for permanent ban', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onSubmit })
    await user.type(screen.getByPlaceholderText(/describe the reason/i), 'Spamming')
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
