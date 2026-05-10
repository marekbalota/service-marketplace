import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './route'

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) }
})

describe('BannedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  async function renderPage(banInfo: { reason?: string | null; expiresAt?: string | null } = {}) {
    sessionStorage.setItem('banInfo', JSON.stringify(banInfo))
    const rootRoute = createRootRoute({ component: Route.options.component! })
    const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
    await act(async () => {
      render(<RouterProvider router={router} />)
    })
  }

  it('renders Account Suspended heading', async () => {
    await renderPage()
    expect(screen.getByText(/account suspended/i)).toBeInTheDocument()
  })

  it('shows the ban reason when present', async () => {
    await renderPage({ reason: 'Posting spam' })
    expect(screen.getByText('Posting spam')).toBeInTheDocument()
  })

  it('does not show a reason section when reason is absent', async () => {
    await renderPage({ reason: null })
    expect(screen.queryByText('Reason:')).not.toBeInTheDocument()
  })

  it('shows Permanent when expiresAt is null', async () => {
    await renderPage({ expiresAt: null })
    expect(screen.getByText('Permanent')).toBeInTheDocument()
  })

  it('shows formatted date when expiresAt is set', async () => {
    await renderPage({ expiresAt: '2030-06-15T12:00:00.000Z' })
    expect(screen.queryByText('Permanent')).not.toBeInTheDocument()
  })

  it('clicking I Understand removes banInfo and navigates to /', async () => {
    await renderPage({ reason: 'Test ban' })
    fireEvent.click(screen.getByRole('button', { name: /i understand/i }))
    expect(sessionStorage.getItem('banInfo')).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
  })
})
