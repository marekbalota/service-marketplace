import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { Route } from './index'
import { useCurrentUser } from '#/lib/queries/users'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockUseActiveProfile = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/auth', () => ({
  authClient: {
    getSession: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
  },
}))

vi.mock('#/lib/queries/users', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
  useCurrentUser: vi.fn(),
}))

vi.mock('#/hooks/useActiveProfile', () => ({
  useActiveProfile: mockUseActiveProfile,
}))

vi.mock('#/api', () => ({
  api: {
    profiles: Object.assign(
      vi.fn(() => ({ patch: vi.fn(), delete: vi.fn() })),
      { post: vi.fn() },
    ),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseUser = {
  userId: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  role: null,
}

const alice = {
  userProfileId: 'profile-1',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  bio: 'Software engineer',
  phoneNumber: '+1 (555) 111-2222',
  fax: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: null,
}

const bob = {
  userProfileId: 'profile-2',
  name: 'Bob Builder',
  email: 'bob@example.com',
  bio: null,
  phoneNumber: null,
  fax: null,
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-03-01'),
}

// ── Render helper ─────────────────────────────────────────────────────────────

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory(),
  })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, profiles: [alice, bob] },
    } as ReturnType<typeof useCurrentUser>)
    mockUseActiveProfile.mockReturnValue({
      activeProfile: alice,
      allProfiles: [alice, bob],
      setActiveProfileId: vi.fn(),
    })
  })

  it('renders the page heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /account settings/i })).toBeInTheDocument()
  })

  it('renders Add Profile link', async () => {
    await renderPage()
    expect(screen.getByRole('link', { name: /add profile/i })).toBeInTheDocument()
  })

  it('renders a card for each profile', async () => {
    await renderPage()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Builder')).toBeInTheDocument()
  })

  it('shows Active badge for the currently active profile', async () => {
    await renderPage()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows profile email', async () => {
    await renderPage()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows phone number when present', async () => {
    await renderPage()
    expect(screen.getByText(/\+1 \(555\) 111-2222/)).toBeInTheDocument()
  })

  it('renders View and Edit links and Delete buttons for each profile', async () => {
    await renderPage()
    const viewLinks = screen.getAllByRole('link', { name: /view/i })
    const editLinks = screen.getAllByRole('link', { name: /edit/i })
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(viewLinks).toHaveLength(2)
    expect(editLinks).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
  })
})
