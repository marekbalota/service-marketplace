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
    useMutation:    mockUseMutation,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/api', () => ({
  api: {
    profiles: { post: vi.fn() },
    images:   { post: vi.fn() },
  },
}))

vi.mock('#/lib/queries/users', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
}))

// ── Import component after mocks ──────────────────────────────────────────────

import { Route } from './route'

// ── Render helper ─────────────────────────────────────────────────────────────

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateProfilePage', () => {
  beforeEach(() => {
    mockUseMutation.mockReturnValue({
      mutate:    vi.fn(),
      isPending: false,
      isError:   false,
      error:     null,
    })
  })

  it('renders the Add Profile heading', async () => {
    await renderPage()
    expect(screen.getByText('Add Profile')).toBeInTheDocument()
  })

  it('renders the Basic Information card title', async () => {
    await renderPage()
    expect(screen.getByText('Basic Information')).toBeInTheDocument()
  })

  it('renders the Images card title', async () => {
    await renderPage()
    expect(screen.getByText('Images')).toBeInTheDocument()
  })

  it('renders a Back button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('renders the Create Profile submit button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /create profile/i })).toBeInTheDocument()
  })

  it('shows error message when mutation fails', async () => {
    mockUseMutation.mockReturnValue({
      mutate:    vi.fn(),
      isPending: false,
      isError:   true,
      error:     new Error('Create failed'),
    })
    await renderPage()
    expect(screen.getByText('Create failed')).toBeInTheDocument()
  })
})
