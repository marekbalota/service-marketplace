import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ForgotPasswordForm } from './ForgotPasswordForm'

vi.mock('#/auth', () => ({
  authClient: {
    requestPasswordReset: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}))

let fireTurnstileSuccess: ((token: string) => void) | undefined

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
    fireTurnstileSuccess = onSuccess
    return null
  },
}))

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fireTurnstileSuccess = undefined
  })

  it('shows confirmation after successful submit', async () => {
    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/if an account with that email exists/i)).toBeInTheDocument()
    })
  })

  it('disables submit button until Turnstile fires onSuccess', () => {
    render(<ForgotPasswordForm />)
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeDisabled()
  })

  it('enables submit button after Turnstile fires onSuccess', async () => {
    render(<ForgotPasswordForm />)
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send reset link/i })).not.toBeDisabled()
    })
  })

  it('shows rate limit countdown and disables submit on 429', async () => {
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.requestPasswordReset).mockImplementationOnce(async (params) => {
      const response = new Response(null, {
        status: 429,
        headers: { 'X-Retry-After': '120' },
      })
      await (
        params as { fetchOptions?: { onError?: (ctx: { response: Response }) => Promise<void> } }
      ).fetchOptions?.onError?.({ response })
      return { data: null, error: { status: 429, message: 'Too many requests' } }
    })

    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again in 2:00/i })).toBeDisabled()
    })
  })

  it('pre-fills the email field when defaultEmail prop is provided', () => {
    render(<ForgotPasswordForm defaultEmail="prefilled@example.com" />)
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    expect(emailInput.value).toBe('prefilled@example.com')
  })

  it('shows root error for unexpected server errors', async () => {
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.requestPasswordReset).mockResolvedValueOnce({
      data: null,
      error: { status: 500, message: 'Internal server error' },
    } as never)

    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument()
    })
  })
})
