import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

const mockDisableEmail = vi.hoisted(() => vi.fn())
const mockDisableTotp = vi.hoisted(() => vi.fn())
const mockInvalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('#/auth', () => ({
  authClient: { twoFactor: { disableEmail: mockDisableEmail, disableTotp: mockDisableTotp } },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: mockInvalidate } }))

import { DisableMethodDialog } from './DisableMethodDialog'

describe('DisableMethodDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDisableEmail.mockResolvedValue({ data: {}, error: null })
    mockDisableTotp.mockResolvedValue({ data: {}, error: null })
  })

  it('renders password field', () => {
    wrap(<DisableMethodDialog open onOpenChange={vi.fn()} method="email" isLastMethod />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('Disable button disabled when password empty', () => {
    wrap(<DisableMethodDialog open onOpenChange={vi.fn()} method="email" isLastMethod />)
    expect(screen.getByRole('button', { name: /^disable$/i })).toBeDisabled()
  })

  it('shows "turn off 2FA entirely" warning when isLastMethod', () => {
    wrap(<DisableMethodDialog open onOpenChange={vi.fn()} method="email" isLastMethod />)
    expect(
      screen.getByText(/turn off two-factor authentication for your account entirely/i),
    ).toBeInTheDocument()
  })

  it('does not show "turn off 2FA entirely" when not isLastMethod', () => {
    wrap(<DisableMethodDialog open onOpenChange={vi.fn()} method="email" isLastMethod={false} />)
    expect(
      screen.queryByText(/turn off two-factor authentication for your account entirely/i),
    ).not.toBeInTheDocument()
  })

  it('shows email-specific warning for email method', () => {
    wrap(<DisableMethodDialog open onOpenChange={vi.fn()} method="email" isLastMethod={false} />)
    expect(screen.getByText(/disable email verification/i)).toBeInTheDocument()
  })

  it('shows totp-specific warning for totp method', () => {
    wrap(<DisableMethodDialog open onOpenChange={vi.fn()} method="totp" isLastMethod={false} />)
    expect(screen.getByText(/disable your authenticator app/i)).toBeInTheDocument()
  })

  it('calls disableEmail and invalidates on confirm', async () => {
    wrap(<DisableMethodDialog open onOpenChange={vi.fn()} method="email" isLastMethod />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'mypass' } })
    fireEvent.click(screen.getByRole('button', { name: /^disable$/i }))
    await waitFor(() => {
      expect(mockDisableEmail).toHaveBeenCalledWith({ password: 'mypass' })
      expect(mockInvalidate).toHaveBeenCalled()
    })
  })

  it('calls disableTotp when method is totp', async () => {
    wrap(<DisableMethodDialog open onOpenChange={vi.fn()} method="totp" isLastMethod={false} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'mypass' } })
    fireEvent.click(screen.getByRole('button', { name: /^disable$/i }))
    await waitFor(() => {
      expect(mockDisableTotp).toHaveBeenCalledWith({ password: 'mypass' })
      expect(mockDisableEmail).not.toHaveBeenCalled()
    })
  })
})
