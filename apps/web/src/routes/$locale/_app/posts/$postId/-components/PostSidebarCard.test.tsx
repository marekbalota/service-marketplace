import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { useActiveProfile } from '#/context/activeProfile'

const mockUseQuery = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: mockUseQuery,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }
})

vi.mock('#/context/activeProfile', () => ({ useActiveProfile: vi.fn() }))
vi.doMock('./SendMessageSection', () => ({
  SendMessageSection: () => <div data-testid="send-message-section" />,
}))

let PostSidebarCard: typeof import('./PostSidebarCard').PostSidebarCard

beforeAll(async () => {
  PostSidebarCard = (await import('./PostSidebarCard')).PostSidebarCard
})

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
    mockUseQuery.mockReturnValueOnce({ data: basePost }).mockReturnValue({ data: undefined })
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
