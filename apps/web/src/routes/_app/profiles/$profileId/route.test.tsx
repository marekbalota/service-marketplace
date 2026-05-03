import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useQuery: vi.fn(() => ({ data: [] })),
  }
})

vi.mock('#/lib/queries/profiles', () => ({
  profileQueryOptions: (id: string) => ({ queryKey: ['profiles', id] }),
  imagesQueryOptions:  (id: string) => ({ queryKey: ['profiles', id, 'images'] }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const profile = {
  userProfileId: 'profile-1',
  accountId:     'user-1',
  name:          'Alice Johnson',
  email:         'alice@example.com',
  bio:           'Software engineer',
  phoneNumber:   '+1 555 0001',
  fax:           '+1 555 0002',
  createdAt:     new Date('2024-01-01'),
  updatedAt:     null,
  accountName:   'Alice',
  roleName:      'user',
}

// ── Render helper ─────────────────────────────────────────────────────────────

import { Route } from './route'

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfileViewPage', () => {
  beforeEach(() => {
    mockUseSuspenseQuery.mockReturnValue({ data: profile })
  })

  it('renders the profile name as page heading', async () => {
    await renderPage()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
  })

  it('renders the Basic Information card title', async () => {
    await renderPage()
    expect(screen.getByText('Basic Information')).toBeInTheDocument()
  })

  it('renders member since date in subtitle area', async () => {
    await renderPage()
    expect(screen.getByText(/member since/i)).toBeInTheDocument()
  })

  it('renders the email', async () => {
    await renderPage()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('renders the phone number', async () => {
    await renderPage()
    expect(screen.getByText('+1 555 0001')).toBeInTheDocument()
  })

  it('renders the fax when present', async () => {
    await renderPage()
    expect(screen.getByText('+1 555 0002')).toBeInTheDocument()
  })

  it('renders the bio', async () => {
    await renderPage()
    expect(screen.getByText('Software engineer')).toBeInTheDocument()
  })

  it('renders a Back button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })
})
