import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from './-utils'

const t = (key: string, opts?: Record<string, unknown>) => {
  if (key === 'messages.justNow') return 'just now'
  if (key === 'messages.minutesAgo') return `${opts?.count}m ago`
  if (key === 'messages.hoursAgo') return `${opts?.count}h ago`
  if (key === 'messages.daysAgo') return `${opts?.count}d ago`
  return key
}

describe('formatRelativeTime', () => {
  it('returns "just now" for times within the last minute', () => {
    const now = new Date(Date.now() - 30_000)
    expect(formatRelativeTime(now, t)).toBe('just now')
  })

  it('returns minutes ago for times within the last hour', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(fiveMinAgo, t)).toBe('5m ago')
  })

  it('returns hours ago for times within the last day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000)
    expect(formatRelativeTime(twoHoursAgo, t)).toBe('2h ago')
  })

  it('returns days ago for older times', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000)
    expect(formatRelativeTime(threeDaysAgo, t)).toBe('3d ago')
  })

  it('accepts an ISO string as well as a Date', () => {
    const iso = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    expect(formatRelativeTime(iso, t)).toBe('10m ago')
  })
})
