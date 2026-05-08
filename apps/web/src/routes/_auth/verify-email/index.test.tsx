import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'

const mockNavigate = vi.hoisted(() => vi.fn())
const mockUseSearch = vi.hoisted(() => vi.fn().mockReturnValue({ email: 'test@example.com' }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    createFileRoute: () => (options: Record<string, unknown>) => ({
      useSearch: mockUseSearch,
      options,
    }),
  }
})

const mockGetSession = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: null, error: null }),
)
const mockSendVerificationEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: {}, error: null }),
)

vi.mock('#/auth', () => ({
  authClient: {
    getSession: mockGetSession,
    sendVerificationEmail: mockSendVerificationEmail,
  },
}))

const mockInvalidateQueries = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('#/router', () => ({
  queryClient: { invalidateQueries: mockInvalidateQueries },
}))

vi.mock('#/lib/queries/users', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'], queryFn: async () => null },
}))

import { Route } from './index'

async function renderPage() {
  const component = (Route as any).options?.component
  const rootRoute = createRootRoute({ component })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockGetSession.mockResolvedValue({ data: null, error: null })
    mockSendVerificationEmail.mockResolvedValue({ data: {}, error: null })
    mockUseSearch.mockReturnValue({ email: 'test@example.com' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders email from search param', async () => {
    await renderPage()
    expect(
      screen.getByText(/we sent a verification link to test@example\.com/i),
    ).toBeInTheDocument()
  })

  it('renders generic message when no email param', async () => {
    mockUseSearch.mockReturnValue({})
    await renderPage()
    expect(
      screen.getByText(/we sent a verification link to your email address/i),
    ).toBeInTheDocument()
  })

  it('does not show resend button when no email param', async () => {
    mockUseSearch.mockReturnValue({})
    await renderPage()
    expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument()
  })

  it('resend button calls sendVerificationEmail with email', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }))
    await waitFor(() => {
      expect(mockSendVerificationEmail).toHaveBeenCalledWith({ email: 'test@example.com' })
    })
  })

  it('resend button is disabled immediately after click', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }))
    expect(screen.getByRole('button', { name: /resend/i })).toBeDisabled()
  })

  it('shows countdown in resend button after click', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }))
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(screen.getByRole('button', { name: /resend \(59s\)/i })).toBeInTheDocument()
  })

  it('re-enables resend button and shows error when sendVerificationEmail fails', async () => {
    mockSendVerificationEmail.mockResolvedValueOnce({
      data: null,
      error: { message: 'Rate limited' },
    })
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }))
    await waitFor(() => {
      expect(screen.getByText(/rate limited/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /resend verification email/i })).not.toBeDisabled()
  })

  it('polling: calls invalidateQueries and navigates to / when session is detected', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { id: 'sess-1' }, user: { id: 'u-1' } },
      error: null,
    })
    await renderPage()
    await act(async () => { vi.advanceTimersByTime(3100) })
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('polling: does not navigate when getSession returns no session', async () => {
    mockGetSession.mockResolvedValue({ data: null, error: null })
    await renderPage()
    await act(async () => { vi.advanceTimersByTime(9000) })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('polling: does not navigate when getSession throws', async () => {
    mockGetSession.mockRejectedValue(new Error('network error'))
    await renderPage()
    await act(async () => { vi.advanceTimersByTime(3100) })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
