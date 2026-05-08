import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LoginForm } from "./LoginForm"

vi.mock("#/auth", () => ({
  authClient: {
    signIn: {
      email: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

vi.mock("#/router", () => ({
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  },
}))

const mockHandleBanError = vi.hoisted(() => vi.fn().mockReturnValue(false))

vi.mock("#/lib/ban-handler", () => ({
  handleBanError: mockHandleBanError,
}))

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHandleBanError.mockReturnValue(false)
  })

  it("renders email and password inputs and a submit button", () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
  })

  it("renders a 'Remember me' checkbox that defaults to unchecked", () => {
    render(<LoginForm />)
    const checkbox = screen.getByRole("checkbox", { name: /remember me/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it("renders a 'Forgot your password?' link", () => {
    render(<LoginForm />)
    expect(screen.getByRole("link", { name: /forgot your password/i })).toBeInTheDocument()
  })

  it("calls authClient.signIn.email with entered values and rememberMe: false by default", async () => {
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
        { email: "alice@example.com", password: "password123", rememberMe: false },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      )
    })
  })

  it("passes rememberMe: true when checkbox is checked before submit", async () => {
    const { authClient } = await import("#/auth")
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@a.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /remember me/i }))
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true }),
        expect.anything(),
      )
    })
  })

  it("shows a validation error for an invalid email format", async () => {
    const { container } = render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
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

  it("shows rate limit countdown and disables submit on 429", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce(async (_creds, callbacks) => {
      const response = new Response(null, {
        status: 429,
        headers: { "X-Retry-After": "60" },
      })
      await (callbacks as { fetchOptions?: { onError?: (ctx: { response: Response }) => Promise<void> } })?.fetchOptions?.onError?.({ response })
      callbacks?.onError?.({ error: { status: 429, message: "Too many requests" } } as never)
      return Promise.resolve({ data: null, error: { status: 429, message: "Too many requests" } })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "x@x.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /log in/i })).toBeDisabled()
    })
  })

  it("calls handleBanError when sign-in onError fires with a banned error", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onError?.({ error: { status: 403, message: "Account banned" } } as never)
      return Promise.resolve({ data: null, error: { status: 403, message: "Account banned" } })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "banned@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(mockHandleBanError).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, message: "Account banned" })
      )
    })
  })

  it("does not show a form error when handleBanError returns true", async () => {
    mockHandleBanError.mockReturnValueOnce(true)
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onError?.({ error: { status: 403, message: "Account banned" } } as never)
      return Promise.resolve({ data: null, error: { status: 403, message: "Account banned" } })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "banned@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(mockHandleBanError).toHaveBeenCalled()
    })
    expect(screen.queryByText(/account banned/i)).not.toBeInTheDocument()
  })

  it("navigates to '/' after login when no redirect prop is given", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onSuccess?.({} as never)
      return Promise.resolve({ data: {}, error: null })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@a.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/' }))
    })
  })

  it("navigates to the redirect path after login when redirect starts with '/'", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onSuccess?.({} as never)
      return Promise.resolve({ data: {}, error: null })
    })

    render(<LoginForm redirect="/messages?foo=bar" />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@a.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/messages?foo=bar' }))
    })
  })

  it("navigates to '/' after login when redirect does not start with '/'", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onSuccess?.({} as never)
      return Promise.resolve({ data: {}, error: null })
    })

    render(<LoginForm redirect="https://evil.com" />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@a.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/' }))
    })
  })

  it("navigates to /verify-email with email when sign-in returns 403", async () => {
    mockHandleBanError.mockReturnValueOnce(false)
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onError?.({ error: { status: 403, message: "Email not verified" } } as never)
      return Promise.resolve({ data: null, error: { status: 403, message: "Email not verified" } })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "unverified@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/verify-email",
        search: { email: "unverified@example.com" },
      })
    })
  })

  it("does not show a form error when redirecting to /verify-email on 403", async () => {
    mockHandleBanError.mockReturnValueOnce(false)
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signIn.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onError?.({ error: { status: 403, message: "Email not verified" } } as never)
      return Promise.resolve({ data: null, error: { status: 403, message: "Email not verified" } })
    })

    render(<LoginForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "unverified@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /log in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled()
    })
    expect(screen.queryByText(/email not verified/i)).not.toBeInTheDocument()
  })
})
