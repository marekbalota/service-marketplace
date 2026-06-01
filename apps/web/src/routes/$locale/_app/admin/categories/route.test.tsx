import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Permissions } from '@marketplace/shared'
import { Route } from './route'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: vi.fn(() => ({
      data: { items: [], total: 0, totalPages: 0 },
    })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    })),
  }
})

vi.mock('#/api', () => ({
  api: {
    admin: {
      categories: Object.assign(
        vi.fn(() => ({
          patch: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockResolvedValue({ error: null }),
        })),
        {
          post: vi.fn().mockResolvedValue({
            data: { categoryId: 'new-1', translations: { en: 'New' } },
            error: null,
          }),
          get: vi.fn().mockResolvedValue({
            data: { items: [], total: 0, totalPages: 0 },
            error: null,
          }),
        },
      ),
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

describe('ManageCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Manage Categories heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /manage categories/i })).toBeInTheDocument()
  })

  it('renders the New Category button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /new category/i })).toBeInTheDocument()
  })

  it('opens create dialog when New Category is clicked', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /new category/i }))
    expect(screen.getByText('Create Category')).toBeInTheDocument()
  })
})

describe('Route.beforeLoad — authorization', () => {
  const callBeforeLoad = (permissions: string[]) =>
    Route.options.beforeLoad!({
      context: { user: { role: { permissions } } },
      params: { locale: 'en' },
    } as Parameters<NonNullable<typeof Route.options.beforeLoad>>[0])

  it('throws redirect when user lacks AdminCategoriesManage permission', () => {
    expect(() => callBeforeLoad([])).toThrow()
  })

  it('throws redirect when user is unauthenticated', () => {
    expect(() =>
      Route.options.beforeLoad!({
        context: { user: null },
        params: { locale: 'en' },
      } as Parameters<NonNullable<typeof Route.options.beforeLoad>>[0])
    ).toThrow()
  })

  it('does not throw when user has AdminCategoriesManage permission', () => {
    expect(() => callBeforeLoad([Permissions.AdminCategoriesManage])).not.toThrow()
  })
})
