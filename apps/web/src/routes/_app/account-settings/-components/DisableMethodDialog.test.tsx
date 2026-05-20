import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

vi.mock('#/auth', () => ({
  authClient: { twoFactor: { disableEmail: vi.fn(), disableTotp: vi.fn() } },
}))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: vi.fn() } }))

import { DisableMethodDialog } from './DisableMethodDialog'

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  warning: 'This will disable the selected method.',
  isPending: false,
  error: null,
  onSubmit: vi.fn(),
}

describe('DisableMethodDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders password field', () => {
    wrap(<DisableMethodDialog {...defaultProps} />)
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('Disable button disabled when password empty', () => {
    wrap(<DisableMethodDialog {...defaultProps} />)
    expect(screen.getByRole('button', { name: /^disable$/i })).toBeDisabled()
  })

  it('shows the provided warning text', () => {
    const warning = 'turn off two-factor authentication for your account entirely'
    wrap(<DisableMethodDialog {...defaultProps} warning={warning} />)
    expect(screen.getByText(warning)).toBeInTheDocument()
  })

  it('shows email-specific warning when passed as warning prop', () => {
    const warning = 'disable email verification codes from being used'
    wrap(<DisableMethodDialog {...defaultProps} warning={warning} />)
    expect(screen.getByText(warning)).toBeInTheDocument()
  })

  it('shows totp-specific warning when passed as warning prop', () => {
    const warning = 'disable your authenticator app from being used'
    wrap(<DisableMethodDialog {...defaultProps} warning={warning} />)
    expect(screen.getByText(warning)).toBeInTheDocument()
  })

  it('calls onSubmit with the entered password on confirm', async () => {
    const onSubmit = vi.fn()
    wrap(<DisableMethodDialog {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'mypass' } })
    fireEvent.click(screen.getByRole('button', { name: /^disable$/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('mypass')
    })
  })

  it('does not call onSubmit when password is empty', () => {
    const onSubmit = vi.fn()
    wrap(<DisableMethodDialog {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^disable$/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows error message when error prop is set', () => {
    wrap(<DisableMethodDialog {...defaultProps} error={new Error('Wrong password')} />)
    expect(screen.getByText('Wrong password')).toBeInTheDocument()
  })
})
