import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockUseMutation = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useMutation: mockUseMutation,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/api', () => ({
  api: {
    profiles: Object.assign(
      vi.fn(() => ({ images: { post: vi.fn() } })),
      { post: vi.fn() },
    ),
    images: Object.assign(
      vi.fn(() => ({ delete: vi.fn() })),
      { post: vi.fn() },
    ),
  },
}))

vi.mock('#/lib/userQueries', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
}))

// ── Import component after mocks ───────────────────────────────────────────────

import { CreateProfilePage } from './route'

async function renderPage() {
  const rootRoute = createRootRoute({ component: CreateProfilePage })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateProfilePage', () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })
  })

  it('renders the page heading', async () => {
    await renderPage()
    expect(screen.getByText(/add a new profile to your account/i)).toBeInTheDocument()
  })

  it('renders the Back link', async () => {
    await renderPage()
    expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument()
  })

  it('renders the Create Profile submit button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /create profile/i })).toBeInTheDocument()
  })

  it('shows error message when mutation fails', async () => {
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new Error('Server error'),
    })
    await renderPage()
    expect(screen.getByText('Server error')).toBeInTheDocument()
  })

  it('renders the Images section', async () => {
    await renderPage()
    expect(screen.getByText('Images')).toBeInTheDocument()
  })
})
