import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGenerateBackupCodes = vi.hoisted(() => vi.fn())
vi.mock('#/auth', () => ({
  authClient: { twoFactor: { generateBackupCodes: mockGenerateBackupCodes } },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: vi.fn() } }))

import { BackupCodesDialog } from './BackupCodesDialog'

describe('BackupCodesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateBackupCodes.mockResolvedValue({ data: { backupCodes: ['new1', 'new2'] }, error: null })
  })

  it('renders password field on step 1', () => {
    render(<BackupCodesDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('View Codes button disabled when password empty', () => {
    render(<BackupCodesDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /view codes/i })).toBeDisabled()
  })

  it('shows Current Codes tab after password confirm', async () => {
    mockGenerateBackupCodes.mockResolvedValueOnce({ data: { backupCodes: ['old1'] }, error: null })
    render(<BackupCodesDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } })
    fireEvent.click(screen.getByRole('button', { name: /view codes/i }))
    await waitFor(() => {
      expect(screen.getByText('old1')).toBeInTheDocument()
    })
  })

  it('switches to Regenerate tab and calls generateBackupCodes on confirm', async () => {
    render(<BackupCodesDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } })
    fireEvent.click(screen.getByRole('button', { name: /view codes/i }))
    await waitFor(() => screen.getByRole('tab', { name: /regenerate/i }))
    fireEvent.click(screen.getByRole('tab', { name: /regenerate/i }))
    fireEvent.click(screen.getByRole('button', { name: /regenerate codes/i }))
    await waitFor(() => {
      expect(mockGenerateBackupCodes).toHaveBeenCalled()
      expect(screen.getByText('new1')).toBeInTheDocument()
    })
  })
})
