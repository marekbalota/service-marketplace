import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from '#/lib/format'
import type { TFunction } from 'i18next'

const t = ((key: string, opts?: Record<string, unknown>) => {
  if (key === 'common.justNow') return 'just now'
  if (key === 'common.minutesAgo') return `${opts?.count}m ago`
  if (key === 'common.hoursAgo') return `${opts?.count}h ago`
  if (key === 'common.daysAgo') return `${opts?.count}d ago`
  return key
}) as unknown as TFunction

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

  it('passes count=1 for exactly 1 minute ago', () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000)
    expect(formatRelativeTime(oneMinAgo, t)).toBe('1m ago')
  })

  it('passes count=1 for exactly 1 hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000)
    expect(formatRelativeTime(oneHourAgo, t)).toBe('1h ago')
  })

  it('passes count=1 for exactly 1 day ago', () => {
    const oneDayAgo = new Date(Date.now() - 86400 * 1000)
    expect(formatRelativeTime(oneDayAgo, t)).toBe('1d ago')
  })
})
