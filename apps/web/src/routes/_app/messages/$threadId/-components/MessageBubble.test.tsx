import { act, render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { MessageBubble } from './MessageBubble'

async function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute({ component: () => ui })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => { render(<RouterProvider router={router} />) })
}

const baseMessage = {
  messageId: 'msg-1',
  content: 'Hello there!',
  createdAt: new Date('2024-06-01T12:00:00Z'),
  sentByMe: false,
  readAt: null,
}

describe('MessageBubble', () => {
  it('renders the message content', async () => {
    await renderWithRouter(
      <MessageBubble message={baseMessage} otherPartyName="Bob Smith" />,
    )
    expect(screen.getByText('Hello there!')).toBeInTheDocument()
  })

  it('shows the other party name for received messages', async () => {
    await renderWithRouter(
      <MessageBubble message={baseMessage} otherPartyName="Bob Smith" />,
    )
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('does not show sender name for sent messages', async () => {
    await renderWithRouter(
      <MessageBubble message={{ ...baseMessage, sentByMe: true }} otherPartyName="Bob Smith" />,
    )
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
  })
})
