import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { RegisterForm } from './RegisterForm'

vi.mock('#/auth', () => ({
  authClient: {
    signUp: {
      email: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

vi.mock('#/router', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}))

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

let fireTurnstileSuccess: ((token: string) => void) | undefined

vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
    fireTurnstileSuccess = onSuccess
    return null
  },
}))

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fireTurnstileSuccess = undefined
  })

  it('renders name, email, password inputs and a submit button', () => {
    render(<RegisterForm />)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('disables submit button until Turnstile fires onSuccess', () => {
    render(<RegisterForm />)
    expect(screen.getByRole('button', { name: /register/i })).toBeDisabled()
  })

  it('enables submit button after Turnstile fires onSuccess', async () => {
    render(<RegisterForm />)
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register/i })).not.toBeDisabled()
    })
  })

  it('calls authClient.signUp.email with entered values on submit', async () => {
    const { authClient } = await import('#/auth')
    render(<RegisterForm />)
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalledWith(
        { name: 'Alice', email: 'alice@example.com', password: 'password123' },
        { headers: { 'x-captcha-response': 'test-token' } },
      )
    })
  })

  it('shows an error message when sign-up fails', async () => {
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.signUp.email).mockResolvedValueOnce({
      data: null,
      error: { message: 'Email already taken' },
    } as never)

    render(<RegisterForm />)
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'taken@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already taken/i)).toBeInTheDocument()
    })
  })

  it('shows captcha error message and makes widget visible on 400 VERIFICATION_FAILED', async () => {
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.signUp.email).mockResolvedValueOnce({
      data: null,
      error: {
        status: 403,
        message: 'Captcha verification failed',
        body: { code: 'VERIFICATION_FAILED', message: 'Captcha verification failed' },
      } as never,
    })

    render(<RegisterForm />)
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/captcha verification failed/i)).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /register/i })).toBeDisabled()
    })
  })

  it('shows a validation error when name is empty', async () => {
    render(<RegisterForm />)
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    // leave name field at its default empty value
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/this field is required/i)).toBeInTheDocument()
    })
  })

  it('shows a validation error for an invalid email format', async () => {
    const { container } = render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    // fireEvent.submit bypasses jsdom's native email constraint check so zodResolver runs
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when password is too short', async () => {
    render(<RegisterForm />)
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('navigates to /verify-email with email after successful registration', async () => {
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.signUp.email).mockResolvedValueOnce({ data: {}, error: null } as never)

    render(<RegisterForm />)
    act(() => {
      fireTurnstileSuccess?.('test-token')
    })
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/verify-email',
        search: { email: 'alice@example.com' },
      })
    })
  })
})
