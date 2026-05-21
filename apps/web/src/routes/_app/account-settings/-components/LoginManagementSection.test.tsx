import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUseQuery = vi.hoisted(() => vi.fn())
const mockUseMutation = vi.hoisted(() => vi.fn())
const mockUseCurrentUser = vi.hoisted(() => vi.fn())
const mockInvalidateQueries = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-query', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
}))
vi.mock('#/lib/queries/users', () => ({
  useCurrentUser: mockUseCurrentUser,
  currentUserQueryOptions: { queryKey: ['users', 'me'] },
}))
vi.mock('../-queries/sessions', () => ({
  sessionsQueryOptions: { queryKey: ['sessions'] },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('#/router', () => ({ queryClient: { invalidateQueries: vi.fn() } }))
vi.mock('./SessionRow', () => ({
  SessionRow: ({
    session,
    isCurrent,
    onRevoke,
  }: {
    session: { id: string; userAgent: string | null }
    isCurrent: boolean
    onRevoke: (id: string) => void
  }) => (
    <div data-testid={`row-${session.id}`}>
      {isCurrent && <span>current-row</span>}
      {!isCurrent && <button onClick={() => onRevoke(session.id)}>Revoke</button>}
    </div>
  ),
}))

import { LoginManagementSection } from './LoginManagementSection'

const makeSessions = (count: number, currentId = 'session-current') =>
  Array.from({ length: count }, (_, i) => ({
    id: i === 0 ? currentId : `session-${i}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 3_600_000),
    ipAddress: '127.0.0.1',
    userAgent: null,
  }))

describe('LoginManagementSection', () => {
  const mutate = vi.fn()
  const reset = vi.fn()

  beforeEach(() => {
    mockUseCurrentUser.mockReturnValue({ data: { sessionId: 'session-current' } })
    mockUseMutation.mockReturnValue({ mutate, isPending: false, reset })
  })

  it('renders session rows from query data', () => {
    mockUseQuery.mockReturnValue({ data: makeSessions(2) })
    render(<LoginManagementSection />)
    expect(screen.getByTestId('row-session-current')).toBeInTheDocument()
    expect(screen.getByTestId('row-session-1')).toBeInTheDocument()
  })

  it('renders current session first regardless of server order', () => {
    // Server returns [session-1, session-2, session-current] — current is last
    const sessions = [
      {
        id: 'session-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3_600_000),
        ipAddress: '127.0.0.1',
        userAgent: null,
      },
      {
        id: 'session-2',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3_600_000),
        ipAddress: '127.0.0.1',
        userAgent: null,
      },
      {
        id: 'session-current',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3_600_000),
        ipAddress: '127.0.0.1',
        userAgent: null,
      },
    ]
    mockUseQuery.mockReturnValue({ data: sessions })
    render(<LoginManagementSection />)
    const rows = screen.getAllByTestId(/^row-/)
    expect(rows[0]).toHaveAttribute('data-testid', 'row-session-current')
  })

  it('marks current session row with isCurrent=true', () => {
    mockUseQuery.mockReturnValue({ data: makeSessions(2) })
    render(<LoginManagementSection />)
    expect(screen.getByText('current-row')).toBeInTheDocument()
  })

  it('shows empty state when only current session exists', () => {
    mockUseQuery.mockReturnValue({ data: makeSessions(1) })
    render(<LoginManagementSection />)
    expect(screen.getByText(/no other active sessions/i)).toBeInTheDocument()
  })

  it('disables bulk logout button in empty state', () => {
    mockUseQuery.mockReturnValue({ data: makeSessions(1) })
    render(<LoginManagementSection />)
    expect(screen.getByRole('button', { name: /log out from all other devices/i })).toBeDisabled()
  })

  it('calls revoke mutation when Revoke is clicked', async () => {
    mockUseQuery.mockReturnValue({ data: makeSessions(2) })
    render(<LoginManagementSection />)
    await userEvent.click(screen.getByRole('button', { name: /revoke/i }))
    expect(mutate).toHaveBeenCalledWith('session-1')
  })

  it('opens confirmation dialog when bulk logout is clicked', async () => {
    mockUseQuery.mockReturnValue({ data: makeSessions(2) })
    render(<LoginManagementSection />)
    await userEvent.click(screen.getByRole('button', { name: /log out from all other devices/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls bulk logout mutation when confirmed', async () => {
    mockUseQuery.mockReturnValue({ data: makeSessions(2) })
    render(<LoginManagementSection />)
    await userEvent.click(screen.getByRole('button', { name: /log out from all other devices/i }))
    await userEvent.click(screen.getByRole('button', { name: /^log out$/i }))
    expect(mutate).toHaveBeenCalled()
  })
})
