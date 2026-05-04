import { act, render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { ThreadItem } from './ThreadItem'
import type { Thread } from '../-queries/threads'

async function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute({ component: () => ui })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => { render(<RouterProvider router={router} />) })
}

const baseThread: Thread = {
  threadId: 'thread-1',
  postId: 'post-1',
  postTitle: 'Math Tutoring',
  otherPartyName: 'Bob Smith',
  lastMessage: { content: 'Is this still available?', createdAt: new Date(Date.now() - 5 * 60 * 1000), sentByMe: false },
  unreadCount: 0,
  myRole: 'initiator',
  postDeleted: false,
}

describe('ThreadItem', () => {
  it('renders the other party name', async () => {
    await renderWithRouter(<ThreadItem thread={baseThread} />)
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('renders the post title', async () => {
    await renderWithRouter(<ThreadItem thread={baseThread} />)
    expect(screen.getByText('Math Tutoring')).toBeInTheDocument()
  })

  it('renders the last message preview', async () => {
    await renderWithRouter(<ThreadItem thread={baseThread} />)
    expect(screen.getByText('Is this still available?')).toBeInTheDocument()
  })

  it('renders unread badge when unreadCount > 0', async () => {
    await renderWithRouter(<ThreadItem thread={{ ...baseThread, unreadCount: 3 }} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows 9+ when unreadCount exceeds 9', async () => {
    await renderWithRouter(<ThreadItem thread={{ ...baseThread, unreadCount: 12 }} />)
    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('shows "Your post" badge when myRole is post_owner', async () => {
    await renderWithRouter(<ThreadItem thread={{ ...baseThread, myRole: 'post_owner' }} />)
    expect(screen.getByText('Your post')).toBeInTheDocument()
  })

  it('renders "Post deleted" badge when postDeleted is true', async () => {
    await renderWithRouter(<ThreadItem thread={{ ...baseThread, postDeleted: true }} />)
    expect(screen.getByText('Post deleted')).toBeInTheDocument()
  })

  it('shows avatar initials from other party name', async () => {
    await renderWithRouter(<ThreadItem thread={baseThread} />)
    expect(screen.getByText('BS')).toBeInTheDocument()
  })
})
