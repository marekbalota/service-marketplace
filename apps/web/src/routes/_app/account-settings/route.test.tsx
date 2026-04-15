import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { AccountSettingsPage } from './route'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())
const mockUseActiveProfile = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useSuspenseQuery: mockUseSuspenseQuery,
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

vi.mock('#/contexts/ActiveProfileContext', () => ({
  profilesQueryOptions: { queryKey: ['profiles', 'me'] },
  useActiveProfile: mockUseActiveProfile,
}))

vi.mock('#/api', () => ({
  api: {
    profiles: Object.assign(
      vi.fn(() => ({ patch: vi.fn(), delete: vi.fn() })),
      { me: { get: vi.fn() }, post: vi.fn() },
    ),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const alice = {
  userProfileId: 'profile-1',
  accountId: 'user-1',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  bio: 'Software engineer',
  phoneNumber: '+1 (555) 111-2222',
  fax: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: null,
  accountName: 'Alice',
  roleName: 'user',
}

const bob = {
  userProfileId: 'profile-2',
  accountId: 'user-1',
  name: 'Bob Builder',
  email: 'bob@example.com',
  bio: null,
  phoneNumber: null,
  fax: null,
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-03-01'),
  accountName: 'Alice',
  roleName: 'user',
}

// ── Render helper ─────────────────────────────────────────────────────────────

async function renderPage() {
  const rootRoute = createRootRoute({ component: AccountSettingsPage })
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
    mockUseSuspenseQuery.mockReturnValue({ data: [alice, bob] })
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

  it('renders Add Profile button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /add profile/i })).toBeInTheDocument()
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

  it('shows profile bio when present', async () => {
    await renderPage()
    expect(screen.getByText('Software engineer')).toBeInTheDocument()
  })

  it('shows phone number when present', async () => {
    await renderPage()
    expect(screen.getByText(/\+1 \(555\) 111-2222/)).toBeInTheDocument()
  })

  it('renders Edit and Delete buttons for each profile', async () => {
    await renderPage()
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(editButtons).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
  })
})
