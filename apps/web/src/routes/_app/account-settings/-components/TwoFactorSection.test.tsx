import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-query', () => ({ useSuspenseQuery: mockUseSuspenseQuery }))
vi.mock('#/lib/queries/two-factor', () => ({
  twoFactorStatusQueryOptions: { queryKey: ['two-factor', 'status'] },
}))
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
  it('shows both methods in Available group when 2FA is disabled', () => {
    mockUseSuspenseQuery.mockReturnValue({
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
    mockUseSuspenseQuery.mockReturnValue({
      data: { twoFactorEnabled: true, enabledMethods: ['email'] },
    })
    render(<TwoFactorSection />)
    expect(screen.getByText(/enabled/i)).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText(/backup codes/i)).toBeInTheDocument()
    expect(screen.getByText('Authenticator App')).toBeInTheDocument()
  })

  it('shows both methods in Enabled group and no Available group when both are on', () => {
    mockUseSuspenseQuery.mockReturnValue({
      data: { twoFactorEnabled: true, enabledMethods: ['email', 'totp'] },
    })
    render(<TwoFactorSection />)
    expect(screen.getByText(/enabled/i)).toBeInTheDocument()
    expect(screen.queryByText(/available/i)).not.toBeInTheDocument()
  })
})
