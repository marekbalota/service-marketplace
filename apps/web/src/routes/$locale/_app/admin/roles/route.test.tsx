import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './route'
import { useCurrentUser } from '#/lib/queries/users'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: vi.fn(() => ({ data: [] })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  }
})

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('#/api', () => ({
  api: {
    admin: {
      roles: {
        get: vi.fn().mockResolvedValue({ data: [], error: null }),
        post: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    },
  },
}))

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('ManageRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { userId: 'u1', role: { priority: 100, permissions: [] } },
    } as unknown as ReturnType<typeof useCurrentUser>)
  })

  it('renders Manage Roles heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /manage roles/i })).toBeInTheDocument()
  })

  it('renders Back to Admin button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /back to admin/i })).toBeInTheDocument()
  })

  it('renders the Create Role button', async () => {
    await renderPage()
    expect(screen.getAllByRole('button', { name: /create role/i }).length).toBeGreaterThan(0)
  })
})
