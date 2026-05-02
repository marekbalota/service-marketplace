import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RegisterForm } from "./RegisterForm"

vi.mock("#/auth", () => ({
  authClient: {
    signUp: {
      email: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}))

vi.mock("#/router", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}))

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe("RegisterForm", () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it("renders name, email, password inputs and a submit button", () => {
    render(<RegisterForm />)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument()
  })

  it("calls authClient.signUp.email with entered values on submit", async () => {
    const { authClient } = await import("#/auth")
    render(<RegisterForm />)

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "alice@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /register/i }))

    await waitFor(() => {
      expect(authClient.signUp.email).toHaveBeenCalledWith(
        { name: "Alice", email: "alice@example.com", password: "password123" },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      )
    })
  })

  it("shows an error message when sign-up fails", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signUp.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onError?.({ error: { message: "Email already taken" } } as never)
      return Promise.resolve({ data: null, error: { message: "Email already taken" } })
    })

    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "taken@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already taken/i)).toBeInTheDocument()
    })
  })

  it("shows a validation error when name is empty", async () => {
    render(<RegisterForm />)
    // leave name field at its default empty value
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "alice@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it("shows a validation error for an invalid email format", async () => {
    const { container } = render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "not-an-email" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    // fireEvent.submit bypasses jsdom's native email constraint check so zodResolver runs
    fireEvent.submit(container.querySelector("form")!)

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
  })

  it("shows validation error when password is too short", async () => {
    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "alice@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "short" } })
    fireEvent.click(screen.getByRole("button", { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it("navigates to /verify-email with email after successful registration", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.signUp.email).mockImplementationOnce((_creds, callbacks) => {
      callbacks?.onSuccess?.({} as never)
      return Promise.resolve({ data: {}, error: null })
    })

    render(<RegisterForm />)
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Alice" } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "alice@example.com" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } })
    fireEvent.click(screen.getByRole("button", { name: /register/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/verify-email",
        search: { email: "alice@example.com" },
      })
    })
  })
})
