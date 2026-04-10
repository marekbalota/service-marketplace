import { act, render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { PostCard } from './PostCard'

async function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute({ component: () => ui })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory(),
  })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

const basePost = {
  postId: 'post-1',
  postTitle: 'Math Tutoring',
  description: 'Experienced math tutor available for all levels.',
  postType: 'OFFER',
  price: null,
  rateType: null,
  createdAt: new Date('2024-01-01'),
  authorName: 'Jane Doe',
  categories: [],
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

  it('toggles favourite state when star button is clicked', async () => {
    await renderWithRouter(<PostCard post={basePost} />)
    const starButton = screen.getByRole('button')
    const star = starButton.querySelector('svg')!

    expect(star.classList.contains('fill-yellow-400')).toBe(false)

    fireEvent.click(starButton)
    expect(star.classList.contains('fill-yellow-400')).toBe(true)

    fireEvent.click(starButton)
    expect(star.classList.contains('fill-yellow-400')).toBe(false)
  })

  it('wraps card in a link to the post detail page', async () => {
    await renderWithRouter(<PostCard post={basePost} />)
    const link = document.querySelector('a[href="/posts/post-1"]')
    expect(link).toBeInTheDocument()
  })
})
