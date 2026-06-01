import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { useCurrentUser } from '#/lib/queries/users'
import { ApiError } from '#/lib/api-error'

const mockUseMutation = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [] })),
    useMutation: mockUseMutation,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('#/api', () => ({
  api: {
    profiles: vi.fn(() => ({
      patch: vi.fn(),
      locations: Object.assign(
        vi.fn(() => ({ delete: vi.fn() })),
        { post: vi.fn(), get: vi.fn(() => ({ data: [] })) },
      ),
    })),
    images: Object.assign(
      vi.fn(() => ({ delete: vi.fn() })),
      {
        post: vi.fn(),
        url: { post: vi.fn() },
      },
    ),
  },
}))

vi.mock('#/lib/queries/users', () => ({
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
  useCurrentUser: vi.fn(),
}))

vi.mock('#/lib/queries/profiles', () => ({
  imagesQueryOptions: (id: string) => ({ queryKey: ['profiles', id, 'images'] }),
  profileQueryOptions: (id: string) => ({ queryKey: ['profiles', id] }),
  profileLocationsQueryOptions: (id: string) => ({ queryKey: ['locations', 'profile', id] }),
}))

import { Route } from './route'

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
  bio: 'Engineer',
  phoneNumber: '+1 555 0001',
  fax: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: null,
}

async function renderPage() {
  const rootRoute = createRootRoute({ component: Route.options.component! })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('EditProfilePage', () => {
  beforeEach(() => {
    vi.spyOn(Route, 'useParams').mockReturnValue({ profileId: 'profile-1' })
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { ...baseUser, profiles: [alice] },
    } as ReturnType<typeof useCurrentUser>)
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    })
  })

  it('renders the Edit Profile heading', async () => {
    await renderPage()
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
  })

  it('renders the page subtitle', async () => {
    await renderPage()
    expect(
      screen.getByText(/update your profile information and manage your saved locations/i),
    ).toBeInTheDocument()
  })

  it('renders the Basic Information card title', async () => {
    await renderPage()
    expect(screen.getByText('Basic Information')).toBeInTheDocument()
  })

  it('renders the Images card title', async () => {
    await renderPage()
    expect(screen.getByText('Images')).toBeInTheDocument()
  })

  it('renders the Saved Locations card title', async () => {
    await renderPage()
    expect(screen.getByText('Saved Locations')).toBeInTheDocument()
  })

  it('renders the Back to Profiles button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /back to profiles/i })).toBeInTheDocument()
  })

  it('renders the Cancel button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('renders the Save Changes button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('renders the Add Location button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument()
  })

  it('shows error message when save mutation fails', async () => {
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new ApiError('Update failed'),
    })
    await renderPage()
    expect(screen.getAllByText('Update failed').length).toBeGreaterThan(0)
  })
})
