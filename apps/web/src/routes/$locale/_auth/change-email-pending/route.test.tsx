import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'

const mockUseSearch = vi.hoisted(() => vi.fn().mockReturnValue({ email: 'new@example.com' }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => ({
      useSearch: mockUseSearch,
      options,
    }),
  }
})

import { Route } from './route'

async function renderPage() {
  const component = (Route as any).options?.component
  const rootRoute = createRootRoute({ component })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('ChangeEmailPendingPage', () => {
  it('renders the heading', async () => {
    await renderPage()
    expect(screen.getByText(/check your new inbox/i)).toBeInTheDocument()
  })

  it('shows the new email from search param', async () => {
    await renderPage()
    expect(screen.getByText(/we sent a verification link to new@example\.com/i)).toBeInTheDocument()
  })

  it('shows generic message when no email param', async () => {
    mockUseSearch.mockReturnValueOnce({})
    await renderPage()
    expect(
      screen.getByText(/we sent a verification link to your new email address/i),
    ).toBeInTheDocument()
  })

  it('renders a link back to account settings', async () => {
    await renderPage()
    const link = screen.getByRole('link', { name: /back to account settings/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/en/account-settings')
  })
})
