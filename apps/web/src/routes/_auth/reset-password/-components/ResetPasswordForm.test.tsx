import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ResetPasswordForm } from "./ResetPasswordForm"

vi.mock("#/auth", () => ({
  authClient: {
    resetPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows invalid state when no token is provided", () => {
    render(<ResetPasswordForm />)
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /request a new link/i })).toBeInTheDocument()
  })

  it("shows invalid state when urlError is present (even with a token)", () => {
    render(<ResetPasswordForm token="tok" urlError="INVALID_TOKEN" />)
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
  })

  it("shows the password form when a valid token is provided", () => {
    render(<ResetPasswordForm token="valid-token" />)
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument()
  })

  it("shows success card after successful password reset", async () => {
    render(<ResetPasswordForm token="valid-token" />)
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpass123" } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "newpass123" } })
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByText(/password has been reset/i)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument()
    })
  })

  it("shows root error on reset failure", async () => {
    const { authClient } = await import("#/auth")
    vi.mocked(authClient.resetPassword).mockResolvedValueOnce({
      data: null,
      error: { message: "Token expired" },
    } as never)

    render(<ResetPasswordForm token="expired-token" />)
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpass123" } })
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "newpass123" } })
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByText(/token expired/i)).toBeInTheDocument()
    })
  })
})
