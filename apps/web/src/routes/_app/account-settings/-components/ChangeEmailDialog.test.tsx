import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChangeEmailDialog } from './ChangeEmailDialog'

vi.mock('#/auth', () => ({
  authClient: {
    changeEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderDialog(props: Partial<React.ComponentProps<typeof ChangeEmailDialog>> = {}) {
  return render(<ChangeEmailDialog open={true} onOpenChange={vi.fn()} {...props} />)
}

describe('ChangeEmailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the New Email field', () => {
    renderDialog()
    expect(screen.getByLabelText(/new email/i)).toBeInTheDocument()
  })

  it('shows a validation error when submitting an invalid email', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/new email/i), 'not-an-email')
    await user.tab()
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('calls authClient.changeEmail with the entered email on valid submit', async () => {
    const { authClient } = await import('#/auth')
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/new email/i), 'new@example.com')
    await user.click(screen.getByRole('button', { name: /^change email$/i }))
    await waitFor(() => {
      expect(authClient.changeEmail).toHaveBeenCalledWith({ newEmail: 'new@example.com' })
    })
  })

  it('calls onOpenChange(false) and shows a success toast on submit success', async () => {
    const { toast } = await import('sonner')
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })
    await user.type(screen.getByLabelText(/new email/i), 'new@example.com')
    await user.click(screen.getByRole('button', { name: /^change email$/i }))
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('confirmation link'),
      )
    })
  })

  it('shows a root-level error when the API returns an error', async () => {
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.changeEmail).mockResolvedValueOnce({
      data: null,
      error: { message: 'Email already in use' },
    } as Awaited<ReturnType<typeof authClient.changeEmail>>)
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/new email/i), 'taken@example.com')
    await user.click(screen.getByRole('button', { name: /^change email$/i }))
    await waitFor(() => {
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
    })
  })

  it('resets the form when the dialog is closed', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/new email/i), 'old@example.com')
    expect(screen.getByLabelText(/new email/i)).toHaveValue('old@example.com')
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.getByLabelText(/new email/i)).toHaveValue('')
    })
  })
})
