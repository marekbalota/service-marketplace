import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function wrapRender(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const mockSetupTotp = vi.hoisted(() => vi.fn())
const mockEnableTotp = vi.hoisted(() => vi.fn())
const mockInvalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('#/auth', () => ({
  authClient: {
    twoFactor: {
      setupTotp: mockSetupTotp,
      enableTotp: mockEnableTotp,
    },
  },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: mockInvalidate } }))

import { EnableTotpDialog } from './EnableTotpDialog'

function renderDialog(open = true) {
  return wrapRender(<EnableTotpDialog open={open} onOpenChange={vi.fn()} />)
}

describe('EnableTotpDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetupTotp.mockResolvedValue({ data: { uri: 'otpauth://test' }, error: null })
    mockEnableTotp.mockResolvedValue({ data: { backupCodes: ['aaa', 'bbb'] }, error: null })
  })

  it('renders password input on step 1', () => {
    renderDialog()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('Continue button disabled when password empty', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('moves to step 2 after password confirm success', async () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => {
      expect(mockSetupTotp).toHaveBeenCalledWith({ password: 'secret123' })
      expect(screen.getByText(/scan the qr code/i)).toBeInTheDocument()
    })
  })

  it('shows error on step 1 when setupTotp fails', async () => {
    mockSetupTotp.mockResolvedValueOnce({ data: null, error: { message: 'Wrong password' } })
    renderDialog()
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => {
      expect(screen.getByText(/wrong password/i)).toBeInTheDocument()
    })
  })

  it('shows backup codes on final step after TOTP verify', async () => {
    renderDialog()
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByText(/scan the qr code/i))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => document.querySelector('[data-input-otp]'))
    const otpInput = document.querySelector('[data-input-otp]') as HTMLInputElement
    fireEvent.change(otpInput, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => {
      expect(mockEnableTotp).toHaveBeenCalledWith({ code: '123456' })
      expect(screen.getByText(/backup codes/i)).toBeInTheDocument()
      expect(screen.getByText('aaa')).toBeInTheDocument()
    })
  })
})
