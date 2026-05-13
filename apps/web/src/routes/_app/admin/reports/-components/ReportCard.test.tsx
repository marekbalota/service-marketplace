import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReportCard } from './ReportCard'

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    })),
    useQuery: vi.fn(() => ({ data: undefined, isLoading: true })),
  }
})

vi.mock('#/api', () => ({
  api: {
    admin: {
      users: vi.fn(() => ({
        ban: { patch: vi.fn().mockResolvedValue({ error: null }) },
        unban: { patch: vi.fn().mockResolvedValue({ error: null }) },
      })),
      reports: vi.fn(() => ({
        resolve: { patch: vi.fn().mockResolvedValue({ error: null }) },
        dismiss: { patch: vi.fn().mockResolvedValue({ error: null }) },
        'message-context': { get: vi.fn().mockResolvedValue({ data: { messages: [] }, error: null }) },
      })),
    },
  },
}))

const baseReport = {
  reportId: 'report-1',
  targetType: 'POST' as const,
  reportedItem: 'Test Service Post',
  reporterName: 'Alice Johnson',
  reportedUserId: 'user-2',
  reportedUserName: 'Bob Smith',
  reportedUserIsBanned: false,
  categoryLabel: 'Spam',
  description: 'This post is spam.',
  createdAt: new Date('2024-04-01'),
  status: 'pending' as const,
  postId: 'post-abc',
  reviewPostId: null,
}

describe('ReportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders report information', () => {
    render(<ReportCard report={baseReport} />)
    expect(screen.getByText('Test Service Post')).toBeInTheDocument()
    expect(screen.getByText('Post')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText(/Bob Smith/)).toBeInTheDocument()
    expect(screen.getByText(/Alice Johnson/)).toBeInTheDocument()
    expect(screen.getByText(/Spam/)).toBeInTheDocument()
    expect(screen.getByText('This post is spam.')).toBeInTheDocument()
  })

  it('shows action buttons for pending reports', () => {
    render(<ReportCard report={baseReport} />)
    expect(screen.getByRole('link', { name: /view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ban user/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('does not show ban/dismiss for resolved reports but still shows view', () => {
    render(<ReportCard report={{ ...baseReport, status: 'resolved' }} />)
    expect(screen.queryByRole('button', { name: /ban/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view/i })).toBeInTheDocument()
  })

  it('does not show ban/dismiss for dismissed reports but still shows view', () => {
    render(<ReportCard report={{ ...baseReport, status: 'dismissed' }} />)
    expect(screen.queryByRole('button', { name: /ban/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view/i })).toBeInTheDocument()
  })

  it('view link points to the post for POST reports', () => {
    render(<ReportCard report={baseReport} />)
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/posts/post-abc')
  })

  it('view link points to the review post for REVIEW reports', () => {
    render(<ReportCard report={{ ...baseReport, targetType: 'REVIEW', postId: null, reviewPostId: 'post-xyz' }} />)
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute('href', '/posts/post-xyz')
  })

  it('view button opens MessageContextDialog for MESSAGE reports', async () => {
    render(<ReportCard report={{ ...baseReport, targetType: 'MESSAGE', postId: null }} />)
    const viewBtn = screen.getByRole('button', { name: /view/i })
    expect(viewBtn).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(viewBtn)
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Message Context')).toBeInTheDocument()
  })

  it('shows Unban User when reported user is already banned', () => {
    render(<ReportCard report={{ ...baseReport, reportedUserIsBanned: true }} />)
    expect(screen.getByRole('button', { name: /unban user/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^ban user$/i })).not.toBeInTheDocument()
  })

  it('opens BanDialog when Ban User is clicked', async () => {
    render(<ReportCard report={baseReport} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /ban user/i }))
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Ban Bob Smith/i)).toBeInTheDocument()
  })

  it('does not show Ban/Unban when reportedUserId is null', () => {
    render(<ReportCard report={{ ...baseReport, reportedUserId: null, reportedUserName: null, reportedUserIsBanned: null }} />)
    expect(screen.queryByRole('button', { name: /ban user/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /unban user/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })
})
