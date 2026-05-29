import { act, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MessageBubble } from './MessageBubble'

vi.mock('#/context/activeProfile', () => ({
  useActiveProfile: vi.fn(),
}))

vi.mock('../../-queries/threads', () => ({
  hasReportedMessageQueryOptions: vi.fn(() => ({
    queryKey: ['test-noop'],
    queryFn: async () => false,
  })),
}))

import { useActiveProfile } from '#/context/activeProfile'

async function renderWithRouter(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const rootRoute = createRootRoute({
    component: () => <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

const baseMessage = {
  messageId: 'msg-1',
  content: 'Hello there!',
  createdAt: new Date('2024-06-01T12:00:00Z'),
  sentByMe: false,
  readAt: null,
}

describe('MessageBubble', () => {
  beforeEach(() => {
    vi.mocked(useActiveProfile).mockReturnValue({
      activeProfile: null,
      setActiveProfileId: vi.fn(),
    })
  })

  it('renders the message content', async () => {
    await renderWithRouter(<MessageBubble message={baseMessage} otherPartyName="Bob Smith" />)
    expect(screen.getByText('Hello there!')).toBeInTheDocument()
  })

  it('shows the other party name for received messages', async () => {
    await renderWithRouter(<MessageBubble message={baseMessage} otherPartyName="Bob Smith" />)
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('does not show sender name for sent messages', async () => {
    await renderWithRouter(
      <MessageBubble message={{ ...baseMessage, sentByMe: true }} otherPartyName="Bob Smith" />,
    )
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
  })
})
