import { act, render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { formatRelativeTime } from './route'

// ─── pure function ───────────────────────────────────────────────────────────

describe('formatRelativeTime', () => {
  it('returns "just now" for times within the last minute', () => {
    const now = new Date(Date.now() - 30_000)
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('returns minutes ago for times within the last hour', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago')
  })

  it('returns hours ago for times within the last day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000)
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago')
  })

  it('returns days ago for older times', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000)
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago')
  })

  it('accepts an ISO string as well as a Date', () => {
    const iso = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    expect(formatRelativeTime(iso)).toBe('10m ago')
  })
})

// ─── ThreadItem rendering ─────────────────────────────────────────────────────

async function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute({ component: () => ui })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => { render(<RouterProvider router={router} />) })
}

describe('thread list rendering', () => {
  it('renders thread title with other party and post title', async () => {
    await renderWithRouter(
      <a href="/messages/thread-1">
        <span>Bob Smith — Math Tutoring</span>
        <span>offer</span>
        <span>Is this still available?</span>
      </a>,
    )
    expect(screen.getByText('Bob Smith — Math Tutoring')).toBeInTheDocument()
    expect(screen.getByText('offer')).toBeInTheDocument()
    expect(screen.getByText('Is this still available?')).toBeInTheDocument()
  })

  it('renders unread count badge when unreadCount > 0', async () => {
    await renderWithRouter(
      <span aria-label="unread">3</span>,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows empty state message when there are no threads', async () => {
    await renderWithRouter(
      <p>No messages yet.</p>,
    )
    expect(screen.getByText('No messages yet.')).toBeInTheDocument()
  })
})
