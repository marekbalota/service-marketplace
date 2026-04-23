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
const mockUseMutation      = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
    useQuery:         vi.fn(() => ({ data: [] })),
    useMutation:      mockUseMutation,
    useQueryClient:   vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/api', () => ({
  api: {
    profiles: vi.fn(() => ({
      patch:  vi.fn(),
      images: { post: vi.fn() },
    })),
    images: vi.fn(() => ({ delete: vi.fn() })),
  },
}))

vi.mock('#/lib/profileQueries', () => ({
  profilesQueryOptions: { queryKey: ['profiles', 'me'] },
}))

vi.mock('#/lib/profileQueries', () => ({
  imagesQueryOptions:  (id: string) => ({ queryKey: ['profiles', id, 'images'] }),
  profileQueryOptions: (id: string) => ({ queryKey: ['profiles', id] }),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const alice = {
  userProfileId: 'profile-1',
  accountId:     'user-1',
  name:          'Alice Johnson',
  email:         'alice@example.com',
  bio:           'Engineer',
  phoneNumber:   '+1 555 0001',
  fax:           null,
  createdAt:     new Date('2024-01-01'),
  updatedAt:     null,
  accountName:   'Alice',
  roleName:      'user',
}

// ── Render helper ─────────────────────────────────────────────────────────────

import { EditProfilePage } from './route'

async function renderPage() {
  const rootRoute = createRootRoute({ component: EditProfilePage })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EditProfilePage', () => {
  beforeEach(() => {
    mockUseSuspenseQuery.mockReturnValue({ data: [alice] })
    mockUseMutation.mockReturnValue({
      mutate:    vi.fn(),
      isPending: false,
      isError:   false,
      error:     null,
    })
  })

  it('renders the page heading', async () => {
    await renderPage()
    expect(screen.getByText(/update your profile information/i)).toBeInTheDocument()
  })

  it('renders the Back link', async () => {
    await renderPage()
    expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument()
  })

  it('renders the Save Changes submit button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('shows error message when patch mutation fails', async () => {
    mockUseMutation.mockReturnValue({
      mutate:    vi.fn(),
      isPending: false,
      isError:   true,
      error:     new Error('Update failed'),
    })
    await renderPage()
    expect(screen.getByText('Update failed')).toBeInTheDocument()
  })
})
