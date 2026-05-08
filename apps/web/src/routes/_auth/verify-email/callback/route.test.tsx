import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'

const mockNavigate = vi.hoisted(() => vi.fn())
const mockUseSearch = vi.hoisted(() => vi.fn().mockReturnValue({}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    createFileRoute: () => (options: Record<string, unknown>) => ({
      useSearch: mockUseSearch,
      options,
    }),
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  }
})

const mockInvalidateQueries = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('#/router', () => ({
  queryClient: { invalidateQueries: mockInvalidateQueries },
}))

import { Route } from './route'

async function renderPage() {
  const component = (Route as any).options?.component
  const rootRoute = createRootRoute({ component })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('VerifyEmailCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockUseSearch.mockReturnValue({})
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('success state (no ?error param)', () => {
    it('renders "Email verified!" heading', async () => {
      await renderPage()
      expect(screen.getByRole('heading', { name: /email verified!/i })).toBeInTheDocument()
    })

    it('renders "Signing you in…" text', async () => {
      await renderPage()
      expect(screen.getByText(/signing you in/i)).toBeInTheDocument()
    })

    it('calls invalidateQueries on mount', async () => {
      await renderPage()
      expect(mockInvalidateQueries).toHaveBeenCalled()
    })

    it('navigates to / after 1.5s', async () => {
      await renderPage()
      await act(async () => { vi.advanceTimersByTime(1600) })
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })

    it('does not navigate before 1.5s', async () => {
      await renderPage()
      await act(async () => { vi.advanceTimersByTime(1000) })
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('error state (?error=invalid_token)', () => {
    beforeEach(() => {
      mockUseSearch.mockReturnValue({ error: 'invalid_token' })
    })

    it('renders "Link expired or invalid" heading', async () => {
      await renderPage()
      expect(
        screen.getByRole('heading', { name: /link expired or invalid/i }),
      ).toBeInTheDocument()
    })

    it('renders link expiry explanation', async () => {
      await renderPage()
      expect(screen.getByText(/verification links expire after 1 hour/i)).toBeInTheDocument()
    })

    it('shows a "Go to sign in" link', async () => {
      await renderPage()
      expect(screen.getByRole('link', { name: /go to sign in/i })).toBeInTheDocument()
    })

    it('does not call invalidateQueries', async () => {
      await renderPage()
      expect(mockInvalidateQueries).not.toHaveBeenCalled()
    })

    it('does not navigate automatically', async () => {
      await renderPage()
      await act(async () => { vi.advanceTimersByTime(2000) })
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })
})
