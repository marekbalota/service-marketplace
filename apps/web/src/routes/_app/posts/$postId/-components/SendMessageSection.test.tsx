import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { SendMessageSection } from './SendMessageSection'

const mockMutate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: null, isLoading: false })),
    useMutation: vi.fn(() => ({ mutate: mockMutate, isPending: false, isError: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  }
})

vi.mock('../-queries/threads', () => ({
  existingThreadQueryOptions: vi.fn(() => ({ queryKey: ['threads', 'existing'] })),
}))

vi.mock('#/api', () => ({
  api: { threads: { post: vi.fn() } },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useRouter: () => ({ navigate: vi.fn() }),
  }
})

vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: vi.fn(() => ({ data: null })),
}))

import { useQuery, useMutation } from '@tanstack/react-query'
import { useCurrentUser } from '#/lib/queries/users'

async function renderSection(props = {}) {
  const rootRoute = createRootRoute({
    component: () => <SendMessageSection postId="post-1" profileId="profile-1" {...props} />,
  })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() })
  await act(async () => {
    render(<RouterProvider router={router} />)
  })
}

describe('SendMessageSection', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({ data: null, isLoading: false } as any)
    vi.mocked(useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
    } as any)
    vi.mocked(useCurrentUser).mockReturnValue({ data: null } as any)
  })

  it('shows "Send Message" button when no existing thread', async () => {
    await renderSection()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('expands the message panel when "Send Message" is clicked', async () => {
    await renderSection()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(screen.getByPlaceholderText(/write your message/i)).toBeInTheDocument()
  })

  it('send button is disabled when the textarea is empty', async () => {
    await renderSection()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(screen.getByRole('button', { name: /^send$/i })).toBeDisabled()
  })

  it('send button is enabled after typing a message', async () => {
    await renderSection()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    fireEvent.change(screen.getByPlaceholderText(/write your message/i), {
      target: { value: 'Hello there' },
    })
    expect(screen.getByRole('button', { name: /^send$/i })).not.toBeDisabled()
  })

  it('collapses the panel and clears draft when Cancel is clicked', async () => {
    await renderSection()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    fireEvent.change(screen.getByPlaceholderText(/write your message/i), {
      target: { value: 'Some draft' },
    })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByPlaceholderText(/write your message/i)).not.toBeInTheDocument()
  })

  it('calls mutation.mutate when Send is clicked with a non-empty draft', async () => {
    await renderSection()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    fireEvent.change(screen.getByPlaceholderText(/write your message/i), {
      target: { value: 'Hello!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }))
    expect(mockMutate).toHaveBeenCalled()
  })

  it('shows "Go to Chat" link when an existing thread is present', async () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [{ threadId: 'thread-1' }],
      isLoading: false,
    } as any)
    await renderSection()
    expect(screen.getByRole('link', { name: /go to chat/i })).toBeInTheDocument()
  })

  it('shows an error message when send mutation fails', async () => {
    vi.mocked(useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: true,
    } as any)
    await renderSection()
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    expect(screen.getByText(/failed to send message/i)).toBeInTheDocument()
  })

  it('shows a disabled Send Message button with tooltip during impersonation', async () => {
    vi.mocked(useCurrentUser).mockReturnValue({
      data: { impersonatedBy: 'admin-id' },
    } as any)
    await renderSection()
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })
})
