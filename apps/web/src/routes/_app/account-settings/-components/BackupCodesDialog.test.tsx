import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const mockGetBackupCodes = vi.hoisted(() => vi.fn())
const mockRegenerateBackupCodes = vi.hoisted(() => vi.fn())
vi.mock('#/auth', () => ({
  authClient: {
    twoFactor: {
      getBackupCodes: mockGetBackupCodes,
      regenerateBackupCodes: mockRegenerateBackupCodes,
    },
  },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: vi.fn() } }))

import { BackupCodesDialog } from './BackupCodesDialog'

describe('BackupCodesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBackupCodes.mockResolvedValue({
      data: { codes: [{ code: 'old1', usedAt: null }] },
      error: null,
    })
    mockRegenerateBackupCodes.mockResolvedValue({
      data: { codes: ['new1', 'new2'] },
      error: null,
    })
  })

  it('renders password field on step 1', () => {
    wrap(<BackupCodesDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('View Codes button disabled when password empty', () => {
    wrap(<BackupCodesDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /view codes/i })).toBeDisabled()
  })

  it('shows Current Codes tab after password confirm', async () => {
    wrap(<BackupCodesDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } })
    fireEvent.click(screen.getByRole('button', { name: /view codes/i }))
    await waitFor(() => {
      expect(screen.getByText('old1')).toBeInTheDocument()
    })
  })

  it('switches to Regenerate tab and calls regenerateBackupCodes on confirm, shows new codes', async () => {
    wrap(<BackupCodesDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } })
    fireEvent.click(screen.getByRole('button', { name: /view codes/i }))
    await waitFor(() => screen.getByRole('tab', { name: /regenerate/i }))
    fireEvent.click(screen.getByRole('tab', { name: /regenerate/i }))
    fireEvent.click(screen.getByRole('button', { name: /regenerate codes/i }))
    await waitFor(() => {
      expect(mockRegenerateBackupCodes).toHaveBeenCalled()
      expect(screen.getByText('new1')).toBeInTheDocument()
    })
  })
})
