import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { useCurrentUser } from '#/lib/userQueries'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockUseMutation = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery:       vi.fn(() => ({ data: [] })),
    useMutation:    mockUseMutation,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/api', () => ({
  api: {
    profiles: vi.fn(() => ({
      patch: vi.fn(),
    })),
    images: Object.assign(
      vi.fn(() => ({ delete: vi.fn() })),
      { post: vi.fn() },
    ),
  },
}))

vi.mock('#/lib/userQueries', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
  useCurrentUser: vi.fn(),
}))

vi.mock('#/lib/profileQueries', () => ({
  imagesQueryOptions:  (id: string) => ({ queryKey: ['profiles', id, 'images'] }),
  profileQueryOptions: (id: string) => ({ queryKey: ['profiles', id] }),
}))

// ── Import component and route after mocks ────────────────────────────────────

import { EditProfilePage, Route } from './route'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseUser = {
  userId: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  role: null,
}

const alice = {
  userProfileId: 'profile-1',
  name:          'Alice Johnson',
  email:         'alice@example.com',
  bio:           'Engineer',
  phoneNumber:   '+1 555 0001',
  fax:           null,
  createdAt:     new Date('2024-01-01'),
  updatedAt:     null,
}

// ── Render helper ─────────────────────────────────────────────────────────────

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
    // Route.useParams() uses TanStack Router's internal context, not the exported
    // useParams hook, so we spy directly on the Route object.
    vi.spyOn(Route, 'useParams').mockReturnValue({ profileId: 'profile-1' })
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, profiles: [alice] },
    } as ReturnType<typeof useCurrentUser>)
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
    expect(screen.getAllByText('Update failed').length).toBeGreaterThan(0)
  })
})
