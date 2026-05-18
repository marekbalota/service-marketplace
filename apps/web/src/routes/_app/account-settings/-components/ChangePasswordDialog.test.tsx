import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChangePasswordDialog } from './ChangePasswordDialog'

vi.mock('#/auth', () => ({
  authClient: {
    changePassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderDialog(props: Partial<React.ComponentProps<typeof ChangePasswordDialog>> = {}) {
  return render(<ChangePasswordDialog open={true} onOpenChange={vi.fn()} {...props} />)
}

describe('ChangePasswordDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all three password fields', () => {
    renderDialog()
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument()
  })

  it('shows required error when current password is empty on submit', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/current password/i), ' ')
    await user.clear(screen.getByLabelText(/current password/i))
    await user.tab()
    await waitFor(() => {
      expect(screen.getByText(/current password is required/i)).toBeInTheDocument()
    })
  })

  it('shows "Passwords do not match" when newPassword and confirmPassword differ', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/^new password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm new password/i), 'different123')
    await user.tab()
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('shows min-length error when newPassword is fewer than 8 characters', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/^new password$/i), 'short')
    await user.tab()
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('calls authClient.changePassword with correct args on valid submit', async () => {
    const { authClient } = await import('#/auth')
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/current password/i), 'oldPass1!')
    await user.type(screen.getByLabelText(/^new password$/i), 'newPass1!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'newPass1!')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(authClient.changePassword).toHaveBeenCalledWith({
        currentPassword: 'oldPass1!',
        newPassword: 'newPass1!',
        revokeOtherSessions: true,
      })
    })
  })

  it('calls onOpenChange(false) and shows toast.success on success', async () => {
    const { toast } = await import('sonner')
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })
    await user.type(screen.getByLabelText(/current password/i), 'oldPass1!')
    await user.type(screen.getByLabelText(/^new password$/i), 'newPass1!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'newPass1!')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('signed out'))
    })
  })

  it('shows root error when API returns wrong-current-password error', async () => {
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.changePassword).mockResolvedValueOnce({
      data: null,
      error: { message: 'Incorrect current password' },
    } as Awaited<ReturnType<typeof authClient.changePassword>>)
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/current password/i), 'wrongPass1!')
    await user.type(screen.getByLabelText(/^new password$/i), 'newPass1!')
    await user.type(screen.getByLabelText(/confirm new password/i), 'newPass1!')
    await user.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => {
      expect(screen.getByText(/incorrect current password/i)).toBeInTheDocument()
    })
  })

  it('resets the form when Cancel is clicked', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.type(screen.getByLabelText(/current password/i), 'somePassword1!')
    expect(screen.getByLabelText(/current password/i)).toHaveValue('somePassword1!')
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.getByLabelText(/current password/i)).toHaveValue('')
    })
  })
})
