import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

vi.mock('ua-parser-js', () => ({
  UAParser: vi.fn().mockImplementation((ua: string) => ({
    getBrowser: () => ({ name: ua.includes('Firefox') ? 'Firefox' : 'Chrome' }),
    getOS: () => ({ name: ua.includes('Mac') ? 'macOS' : 'Windows' }),
    getDevice: () => ({ type: ua.includes('Mobile') ? 'mobile' : undefined }),
  })),
}))

import { SessionRow } from './SessionRow'

const baseSession = {
  id: 'session-1',
  createdAt: new Date('2025-05-18T10:00:00Z'),
  updatedAt: new Date(),
  expiresAt: new Date(Date.now() + 3_600_000),
  ipAddress: '192.168.1.1',
  userAgent: 'Chrome on Windows',
}

describe('SessionRow', () => {
  it('renders browser/OS from userAgent', () => {
    render(<SessionRow session={baseSession} isCurrent={false} onRevoke={vi.fn()} />)
    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument()
  })

  it('renders IP address', () => {
    render(<SessionRow session={baseSession} isCurrent={false} onRevoke={vi.fn()} />)
    expect(screen.getByText(/192\.168\.1\.1/)).toBeInTheDocument()
  })

  it('shows "This device" badge and disabled Current button for current session', () => {
    render(<SessionRow session={baseSession} isCurrent={true} onRevoke={vi.fn()} />)
    expect(screen.getByText(/this device/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /current/i })).toBeDisabled()
  })

  it('shows Revoke button for non-current sessions', () => {
    render(<SessionRow session={baseSession} isCurrent={false} onRevoke={vi.fn()} />)
    expect(screen.queryByText(/this device/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument()
  })

  it('calls onRevoke with session id when Revoke is clicked', async () => {
    const onRevoke = vi.fn()
    render(<SessionRow session={baseSession} isCurrent={false} onRevoke={onRevoke} />)
    await userEvent.click(screen.getByRole('button', { name: /revoke/i }))
    expect(onRevoke).toHaveBeenCalledWith('session-1')
  })

  it('shows Smartphone icon for mobile userAgent', () => {
    const mobileSession = { ...baseSession, userAgent: 'Safari Mobile iPhone' }
    const { container } = render(
      <SessionRow session={mobileSession} isCurrent={false} onRevoke={vi.fn()} />,
    )
    expect(container.querySelector('[data-testid="device-icon-mobile"]')).toBeInTheDocument()
  })

  it('shows Monitor icon and fallback label for null userAgent', () => {
    const noUaSession = { ...baseSession, userAgent: null }
    const { container } = render(
      <SessionRow session={noUaSession} isCurrent={false} onRevoke={vi.fn()} />,
    )
    expect(container.querySelector('[data-testid="device-icon-desktop"]')).toBeInTheDocument()
  })
})
