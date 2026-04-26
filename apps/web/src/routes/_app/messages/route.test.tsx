import { describe, it, expect } from 'vitest'
import { formatRelativeTime } from './-utils'

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
