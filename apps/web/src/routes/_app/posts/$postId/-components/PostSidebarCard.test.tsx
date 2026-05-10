import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useActiveProfile } from '#/context/activeProfile'
import { PostSidebarCard } from './PostSidebarCard'

const mockUseSuspenseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useSuspenseQuery: mockUseSuspenseQuery }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }
})

vi.mock('#/context/activeProfile', () => ({ useActiveProfile: vi.fn() }))
vi.mock('./SendMessageSection', () => ({
  SendMessageSection: () => <div data-testid="send-message-section" />,
}))

const basePost = {
  postId: 'post-1',
  postTitle: 'Lawn Care Service',
  description: 'Professional lawn care.',
  postType: 'OFFER',
  categories: [],
  price: '50.00',
  rateType: 'HOURLY',
  location: { city: 'Brno', country: 'Czech Republic', street: null, postalCode: null },
  authorId: 'profile-author',
  authorName: 'Bob',
  reviews: [],
  reviewCount: 3,
  averageRating: 4.3,
}

describe('PostSidebarCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSuspenseQuery.mockReturnValue({ data: basePost })
    vi.mocked(useActiveProfile).mockReturnValue({ activeProfile: null } as ReturnType<
      typeof useActiveProfile
    >)
  })

  it('renders location when present', async () => {
    await act(async () => render(<PostSidebarCard postId="post-1" />))
    expect(screen.getByText(/brno/i)).toBeInTheDocument()
  })

  it('renders rate type when present', async () => {
    await act(async () => render(<PostSidebarCard postId="post-1" />))
    expect(screen.getByText('Hourly')).toBeInTheDocument()
  })

  it('renders rating when reviews exist', async () => {
    await act(async () => render(<PostSidebarCard postId="post-1" />))
    expect(screen.getByText(/4\.3.*3 reviews/i)).toBeInTheDocument()
  })

  it('shows SendMessageSection for authenticated non-owner', async () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: {
        userProfileId: 'profile-visitor',
        name: 'Alice',
        email: 'alice@example.com',
      },
    } as ReturnType<typeof useActiveProfile>)
    await act(async () => render(<PostSidebarCard postId="post-1" />))
    expect(screen.getByTestId('send-message-section')).toBeInTheDocument()
  })

  it('does not show SendMessageSection for the post owner', async () => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: { userProfileId: 'profile-author', name: 'Bob', email: 'bob@example.com' },
    } as ReturnType<typeof useActiveProfile>)
    await act(async () => render(<PostSidebarCard postId="post-1" />))
    expect(screen.queryByTestId('send-message-section')).not.toBeInTheDocument()
  })
})
