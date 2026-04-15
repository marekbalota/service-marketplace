import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LoginForm } from "./LoginForm"

vi.mock("#/auth", () => ({
  authClient: {
    signIn: {
      email: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}))

const mockHandleBanError = vi.hoisted(() => vi.fn().mockReturnValue(false))

vi.mock('#/lib/ban-handler', () => ({
  handleBanError: mockHandleBanError,
}))

describe("LoginForm", () => {
  it("renders email and password inputs and a submit button", () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
  })

  it("calls authClient.signIn.email with entered values on submit", async () => {
    const { authClient } = await import("#/auth")
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "alice@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith(
        { email: "alice@example.com", password: "password123" },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      )
    })
  })

  it("shows a validation error for an invalid email format", async () => {
    const { container } = render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    // fireEvent.submit bypasses jsdom's native email constraint check so zodResolver runs
    fireEvent.submit(container.querySelector("form")!)

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it("shows an error message when sign-in fails", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onError?.({ error: { message: "Invalid credentials" } } as never)
      return Promise.resolve({ data: null, error: { message: "Invalid credentials" } })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "x@x.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrongpass" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('calls handleBanError when sign-in onError fires with a banned error', async () => {
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onError?.({ error: { status: 403, message: 'Account banned' } } as never)
      return Promise.resolve({ data: null, error: { status: 403, message: 'Account banned' } })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'banned@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mockHandleBanError).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, message: 'Account banned' })
      )
    })
  })

  it('does not show a form error when handleBanError returns true', async () => {
    mockHandleBanError.mockReturnValueOnce(true)
    const { authClient } = await import('#/auth')
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onError?.({ error: { status: 403, message: 'Account banned' } } as never)
      return Promise.resolve({ data: null, error: { status: 403, message: 'Account banned' } })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'banned@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mockHandleBanError).toHaveBeenCalled()
    })
    expect(screen.queryByText(/account banned/i)).not.toBeInTheDocument()
  })
})
