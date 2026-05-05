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

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery:       vi.fn(() => ({ data: [] })),
    useMutation:    vi.fn(() => ({
      mutate:    vi.fn(),
      isPending: false,
      isError:   false,
      error:     null,
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

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(() => ({
    activeProfile: { userProfileId: 'profile-1', name: 'Alice Johnson' },
    setActiveProfileId: vi.fn(),
  })),
}))

vi.mock('#/api', () => ({
  api: {
    profiles: Object.assign(
      vi.fn(() => ({ patch: vi.fn(), delete: vi.fn() })),
      { post: vi.fn() },
    ),
  },
}))

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

describe('ManageProfilesPage', () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, profiles: [alice, bob] },
    } as ReturnType<typeof useCurrentUser>)
  })

  it('renders the Manage Profiles heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: /manage profiles/i })).toBeInTheDocument()
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

  it('renders View and Edit links and Delete buttons for each profile', async () => {
    await renderPage()
    const viewLinks = screen.getAllByRole('link', { name: /view/i })
    const editLinks = screen.getAllByRole('link', { name: /edit/i })
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(viewLinks).toHaveLength(2)
    expect(editLinks).toHaveLength(2)
    expect(deleteButtons).toHaveLength(2)
  })

  it('hides the Delete button when only one profile remains', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, profiles: [alice] },
    } as ReturnType<typeof useCurrentUser>)
    await renderPage()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})
