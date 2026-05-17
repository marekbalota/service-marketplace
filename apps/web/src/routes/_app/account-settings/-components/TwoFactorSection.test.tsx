import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const mockUseQuery = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-query', () => ({ useQuery: mockUseQuery }))
vi.mock('#/lib/queries/two-factor', () => ({
  twoFactorStatusQueryOptions: { queryKey: ['two-factor', 'status'] },
}))
vi.mock('./EnableTotpDialog', () => ({
  EnableTotpDialog: ({ open }: { open: boolean }) => open ? <div>EnableTotpDialog</div> : null,
}))
vi.mock('./EnableEmailDialog', () => ({
  EnableEmailDialog: ({ open }: { open: boolean }) => open ? <div>EnableEmailDialog</div> : null,
}))
vi.mock('./BackupCodesDialog', () => ({
  BackupCodesDialog: ({ open }: { open: boolean }) => open ? <div>BackupCodesDialog</div> : null,
}))
vi.mock('./DisableMethodDialog', () => ({
  DisableMethodDialog: ({ open }: { open: boolean }) => open ? <div>DisableMethodDialog</div> : null,
}))

import { TwoFactorSection } from './TwoFactorSection'

describe('TwoFactorSection', () => {
  it('shows loading skeleton when data is loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true })
    render(<TwoFactorSection />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('shows both methods in Available group when 2FA is disabled', () => {
    mockUseQuery.mockReturnValue({
      data: { twoFactorEnabled: false, totpEnabled: false },
      isLoading: false,
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
      data: { twoFactorEnabled: true, totpEnabled: false },
      isLoading: false,
    })
    render(<TwoFactorSection />)
    expect(screen.getByText(/enabled/i)).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText(/backup codes/i)).toBeInTheDocument()
    expect(screen.getByText('Authenticator App')).toBeInTheDocument()
  })

  it('shows both methods in Enabled group and no Available group when both are on', () => {
    mockUseQuery.mockReturnValue({
      data: { twoFactorEnabled: true, totpEnabled: true },
      isLoading: false,
    })
    render(<TwoFactorSection />)
    expect(screen.getByText(/enabled/i)).toBeInTheDocument()
    expect(screen.queryByText(/available/i)).not.toBeInTheDocument()
  })
})
