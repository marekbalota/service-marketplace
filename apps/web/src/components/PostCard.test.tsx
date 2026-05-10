import { act, render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { PostCard, type Post } from './PostCard'

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(() => ({ data: { userId: 'u1' } })),
}))

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(() => ({ activeProfile: null })),
}))

vi.mock('#/api', () => ({
  api: {
    favourites: Object.assign(
      vi.fn(() => ({ post: vi.fn(), delete: vi.fn() })),
      {
        get: vi.fn(),
      },
    ),
  },
}))

async function renderWithRouter(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({ component: () => ui })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory(),
  })
  await act(async () => {
    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
  })
}

const basePost: Post = {
  postId: 'post-1',
  postTitle: 'Math Tutoring',
  description: 'Experienced math tutor available for all levels.',
  postType: 'OFFER',
  price: null,
  rateType: null,
  createdAt: new Date('2024-01-01'),
  authorId: 'author-1',
  authorName: 'Jane Doe',
  categories: [],
  location: null,
}

describe('PostCard', () => {
  it('renders the post title', async () => {
    await renderWithRouter(<PostCard post={basePost} />)
    expect(screen.getByText('Math Tutoring')).toBeInTheDocument()
  })

  it('renders the description', async () => {
    await renderWithRouter(<PostCard post={basePost} />)
    expect(screen.getByText('Experienced math tutor available for all levels.')).toBeInTheDocument()
  })

  it('renders the author name', async () => {
    await renderWithRouter(<PostCard post={basePost} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('shows "Offering" badge for OFFER type', async () => {
    await renderWithRouter(<PostCard post={basePost} />)
    expect(screen.getByText('Offering')).toBeInTheDocument()
  })

  it('shows "Requesting" badge for REQUEST type', async () => {
    await renderWithRouter(<PostCard post={{ ...basePost, postType: 'REQUEST' }} />)
    expect(screen.getByText('Requesting')).toBeInTheDocument()
  })

  it('shows price when provided', async () => {
    await renderWithRouter(<PostCard post={{ ...basePost, price: '50.00' }} />)
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('shows /hr suffix for HOURLY rate', async () => {
    await renderWithRouter(<PostCard post={{ ...basePost, price: '30.00', rateType: 'HOURLY' }} />)
    expect(screen.getByText('/hr')).toBeInTheDocument()
  })

  it('does not show /hr suffix for FIXED rate', async () => {
    await renderWithRouter(<PostCard post={{ ...basePost, price: '200.00', rateType: 'FIXED' }} />)
    expect(screen.queryByText('/hr')).not.toBeInTheDocument()
  })

  it('shows the primary category badge', async () => {
    await renderWithRouter(
      <PostCard
        post={{
          ...basePost,
          categories: [{ categoryId: 'cat-1', name: 'Education' }],
        }}
      />,
    )
    expect(screen.getByText('Education')).toBeInTheDocument()
  })

  it('shows favourite button when user is authenticated', async () => {
    await renderWithRouter(<PostCard post={basePost} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('wraps card in a link to the post detail page', async () => {
    await renderWithRouter(<PostCard post={basePost} />)
    const link = document.querySelector('a[href="/posts/post-1"]')
    expect(link).toBeInTheDocument()
  })

  it('shows the city when a location is provided', async () => {
    await renderWithRouter(
      <PostCard
        post={{ ...basePost, location: { locationId: 'loc-1', city: 'Prague', country: 'CZ' } }}
      />,
    )
    expect(screen.getByText('Prague')).toBeInTheDocument()
  })

  it('calls onDelete when the delete button is clicked', async () => {
    const onDelete = vi.fn()
    await renderWithRouter(<PostCard post={basePost} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('disables the delete button when deleteDisabled is true', async () => {
    await renderWithRouter(<PostCard post={basePost} onDelete={vi.fn()} deleteDisabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
