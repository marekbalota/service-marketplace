import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const mockSetupEmail = vi.hoisted(() => vi.fn())
const mockEnableEmail = vi.hoisted(() => vi.fn())
const mockInvalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('#/auth', () => ({
  authClient: {
    twoFactor: {
      setupEmail: mockSetupEmail,
      enableEmail: mockEnableEmail,
    },
  },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: mockInvalidate } }))

import { EnableEmailDialog } from './EnableEmailDialog'

describe('EnableEmailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetupEmail.mockResolvedValue({ data: {}, error: null })
    mockEnableEmail.mockResolvedValue({ data: {}, error: null })
  })

  it('renders password input on step 1', () => {
    wrap(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('Continue disabled when password is empty', () => {
    wrap(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('moves to step 2 (send code screen) after password confirm — no API call', async () => {
    wrap(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument()
    })
    expect(mockSetupEmail).not.toHaveBeenCalled()
  })

  it('Back button visible on step 2 before and after sending code', async () => {
    wrap(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByRole('button', { name: /send code/i }))
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => { expect(mockSetupEmail).toHaveBeenCalled() })
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('clicking Send Code calls setupEmail with password', async () => {
    wrap(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByRole('button', { name: /send code/i }))
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => {
      expect(mockSetupEmail).toHaveBeenCalledWith({ password: 'pass123' })
    })
  })

  it('after Send Code, OTP input appears', async () => {
    wrap(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByRole('button', { name: /send code/i }))
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => mockSetupEmail.mock.calls.length > 0)
    await waitFor(() => {
      expect(document.querySelector('[data-input-otp]')).toBeInTheDocument()
    })
  })

  it('after entering OTP and clicking Verify, calls enableEmail and invalidates query', async () => {
    wrap(<EnableEmailDialog open onOpenChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByRole('button', { name: /send code/i }))
    fireEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => document.querySelector('[data-input-otp]'))
    const otpInput = document.querySelector('[data-input-otp]') as HTMLInputElement
    fireEvent.change(otpInput, { target: { value: '654321' } })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => {
      expect(mockEnableEmail).toHaveBeenCalledWith({ code: '654321' })
      expect(mockInvalidate).toHaveBeenCalled()
    })
  })
})
