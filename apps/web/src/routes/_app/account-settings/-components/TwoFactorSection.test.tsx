import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUseQuery = vi.hoisted(() => vi.fn())
const mockUseCurrentUser = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false, error: null, reset: vi.fn() })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))
vi.mock('#/lib/queries/two-factor', () => ({
  twoFactorStatusQueryOptions: { queryKey: ['two-factor', 'status'] },
}))
vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: mockUseCurrentUser,
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
}))
vi.mock('#/auth', () => ({
  authClient: {
    twoFactor: {
      disableEmail: vi.fn(),
      disableTotp: vi.fn(),
    },
  },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
vi.mock('./EnableTotpDialog', () => ({
  EnableTotpDialog: ({ open }: { open: boolean }) => (open ? <div>EnableTotpDialog</div> : null),
}))
vi.mock('./EnableEmailDialog', () => ({
  EnableEmailDialog: ({ open }: { open: boolean }) => (open ? <div>EnableEmailDialog</div> : null),
}))
vi.mock('./BackupCodesDialog', () => ({
  BackupCodesDialog: ({ open }: { open: boolean }) => (open ? <div>BackupCodesDialog</div> : null),
}))
vi.mock('./DisableMethodDialog', () => ({
  DisableMethodDialog: ({ open }: { open: boolean }) =>
    open ? <div>DisableMethodDialog</div> : null,
}))

import { TwoFactorSection } from './TwoFactorSection'

describe('TwoFactorSection', () => {
  beforeEach(() => {
    mockUseCurrentUser.mockReturnValue({ data: { email: 'alice@example.com' } })
  })

  it('shows both methods in Available group when 2FA is disabled', () => {
    mockUseQuery.mockReturnValue({
      data: { twoFactorEnabled: false, enabledMethods: [] },
    })
    render(<TwoFactorSection />)
    expect(screen.getByText(/available/i)).toBeInTheDocument()
    expect(screen.getByText('Authenticator App')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.queryByText(/enabled/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/backup codes/i)).not.toBeInTheDocument()
  })

  it('shows Email in Enabled group and Backup Codes when email-only 2FA is on', () => {
    mockUseQuery.mockReturnValue({
      data: { twoFactorEnabled: true, enabledMethods: ['email'] },
    })
    render(<TwoFactorSection />)
    expect(screen.getByText(/enabled/i)).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText(/backup codes/i)).toBeInTheDocument()
    expect(screen.getByText('Authenticator App')).toBeInTheDocument()
  })

  it('shows both methods in Enabled group and no Available group when both are on', () => {
    mockUseQuery.mockReturnValue({
      data: { twoFactorEnabled: true, enabledMethods: ['email', 'totp'] },
    })
    render(<TwoFactorSection />)
    expect(screen.getByText(/enabled/i)).toBeInTheDocument()
    expect(screen.queryByText(/available/i)).not.toBeInTheDocument()
  })

  describe('during impersonation', () => {
    beforeEach(() => {
      mockUseCurrentUser.mockReturnValue({
        data: { impersonatedBy: 'admin-uuid' },
      })
    })

    it('disables Enable buttons for available methods', () => {
      mockUseQuery.mockReturnValue({
        data: { twoFactorEnabled: false, enabledMethods: [] },
      })
      render(<TwoFactorSection />)
      const enableButtons = screen.getAllByRole('button', { name: /^enable$/i })
      enableButtons.forEach((btn) => expect(btn).toBeDisabled())
    })

    it('disables Disable buttons for enabled methods', () => {
      mockUseQuery.mockReturnValue({
        data: { twoFactorEnabled: true, enabledMethods: ['email'] },
      })
      render(<TwoFactorSection />)
      const disableButton = screen.getByRole('button', { name: /^disable$/i })
      expect(disableButton).toBeDisabled()
    })

    it('disables Manage Backup Codes button', () => {
      mockUseQuery.mockReturnValue({
        data: { twoFactorEnabled: true, enabledMethods: ['email'] },
      })
      render(<TwoFactorSection />)
      const manageButton = screen.getByRole('button', { name: /^manage$/i })
      expect(manageButton).toBeDisabled()
    })
  })
})
