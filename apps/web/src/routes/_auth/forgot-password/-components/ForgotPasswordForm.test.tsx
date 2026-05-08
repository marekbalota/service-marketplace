import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

vi.mock("#/auth", () => ({
  authClient: {
    requestPasswordReset: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}))

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows confirmation after successful submit", async () => {
    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/if an account with that email exists/i)).toBeInTheDocument()
    })
  })

  it("shows rate limit countdown and disables submit on 429", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.requestPasswordReset).mockImplementationOnce(async (params) => {
      const response = new Response(null, {
        status: 429,
        headers: { "X-Retry-After": "120" },
      })
      await (params as { fetchOptions?: { onError?: (ctx: { response: Response }) => Promise<void> } }).fetchOptions?.onError?.({ response })
      return { data: null, error: { status: 429, message: "Too many requests" } }
    })

    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/too many attempts — try again in 2:00/i)).toBeInTheDocument()
      expect(screen.getByRole("button")).toBeDisabled()
    })
  })

  it("shows root error for unexpected server errors", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.requestPasswordReset).mockResolvedValueOnce({
      data: null,
      error: { status: 500, message: "Internal server error" },
    } as never)

    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }))

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument()
    })
  })
})
