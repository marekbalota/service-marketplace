import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Route } from './index'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQuery: vi.fn() }
})

const mockData = {
  total: 150,
  items: [
    { bucket: '2026.05.01', count: 5 },
    { bucket: '2026.05.02', count: 8 },
    { bucket: '2026.05.03', count: 12 },
    { bucket: '2026.05.04', count: 3 },
    { bucket: '2026.05.05', count: 7 },
    { bucket: '2026.05.06', count: 9 },
    { bucket: '2026.05.07', count: 6 },
  ],
}

async function renderPage() {
  vi.mocked(useQuery).mockReturnValue({
    data: mockData,
    isPending: false,
  } as ReturnType<typeof useQuery>)
  vi.spyOn(Route, 'useParams').mockReturnValue({ metric: 'users' } as any)
  vi.spyOn(Route, 'useSearch').mockReturnValue({ range: '30d', granularity: undefined } as any)
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/admin/analytics/users?range=30d'] }),
  })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('Analytics page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Users / Posts / Messages tabs', async () => {
    await renderPage()
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Posts')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
  })

  it('shows correct Period Total derived from items', async () => {
    await renderPage()
    const periodTotal = mockData.items.reduce((s, r) => s + r.count, 0) // 50
    // Period Total and Last 7 Days are both 50 for this dataset — use getAllByText
    const matches = screen.getAllByText(periodTotal.toString())
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows correct all-time Total', async () => {
    await renderPage()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('shows Top Performing Days heading', async () => {
    await renderPage()
    expect(screen.getByText(/top performing days/i)).toBeInTheDocument()
  })

  it('shows Insights card', async () => {
    await renderPage()
    expect(screen.getByText(/insights/i)).toBeInTheDocument()
  })

  it('shows granularity toggle for 30d range', async () => {
    await renderPage()
    // 30d range offers Day and Week options
    expect(screen.getByText('Day')).toBeInTheDocument()
    expect(screen.getByText('Week')).toBeInTheDocument()
  })
})
