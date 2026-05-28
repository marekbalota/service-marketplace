import { describe, it, expect } from 'vitest'
import {
  getDrillDown,
  getPreviousWindow,
  getEvenTicks,
  formatBucket,
  formatBucketLabel,
  resolveGranularity,
  granularityOptionsForWindow,
} from './-utils'

const D = (iso: string) => new Date(iso)

describe('getDrillDown', () => {
  it('year → month range covering the full year', () => {
    const result = getDrillDown(D('2026-01-01T00:00:00Z'), 'year')
    expect(result).toEqual({ from: '2026-01-01', to: '2026-12-31', granularity: 'month' })
  })

  it('year drill-down works for December (boundary month)', () => {
    const result = getDrillDown(D('2025-01-01T00:00:00Z'), 'year')
    expect(result).toEqual({ from: '2025-01-01', to: '2025-12-31', granularity: 'month' })
  })

  it('month → week range covering the full month', () => {
    const result = getDrillDown(D('2026-03-01T00:00:00Z'), 'month')
    expect(result).toEqual({ from: '2026-03-01', to: '2026-03-31', granularity: 'week' })
  })

  it('month drill-down last day is correct for February (non-leap year)', () => {
    const result = getDrillDown(D('2026-02-01T00:00:00Z'), 'month')
    expect(result?.to).toBe('2026-02-28')
  })

  it('month drill-down last day is correct for February (leap year)', () => {
    const result = getDrillDown(D('2024-02-01T00:00:00Z'), 'month')
    expect(result?.to).toBe('2024-02-29')
  })

  it('week → day range spanning 7 days inclusive', () => {
    const result = getDrillDown(D('2026-01-05T00:00:00Z'), 'week')
    expect(result).toEqual({ from: '2026-01-05', to: '2026-01-11', granularity: 'day' })
  })

  it('day → hour same-day range', () => {
    const result = getDrillDown(D('2026-05-15T00:00:00Z'), 'day')
    expect(result).toEqual({ from: '2026-05-15', to: '2026-05-15', granularity: 'hour' })
  })

  it('hour returns null (cannot drill further)', () => {
    expect(getDrillDown(D('2026-01-01T00:00:00Z'), 'hour')).toBeNull()
  })
})

describe('getPreviousWindow', () => {
  it('returns null when from is undefined (all-time range)', () => {
    expect(getPreviousWindow(undefined, '2026-05-27')).toBeNull()
  })

  it('single-day window: previous window is the day before', () => {
    const result = getPreviousWindow('2026-05-15', '2026-05-15')
    expect(result).toEqual({ from: '2026-05-14', to: '2026-05-14' })
  })

  it('7-day window: previous window spans the prior 7 days', () => {
    const result = getPreviousWindow('2026-05-20', '2026-05-26')
    expect(result).toEqual({ from: '2026-05-13', to: '2026-05-19' })
  })

  it('30-day window: previous window spans the prior 30 days', () => {
    const result = getPreviousWindow('2026-04-27', '2026-05-26')
    expect(result?.from).toBe('2026-03-28')
    expect(result?.to).toBe('2026-04-26')
  })

  it('windows are non-overlapping and contiguous', () => {
    const result = getPreviousWindow('2026-05-01', '2026-05-31')
    // prevTo must be the day before from
    expect(new Date(result!.to + 'T00:00:00Z').getTime())
      .toBe(new Date('2026-04-30T00:00:00Z').getTime())
  })
})

describe('getEvenTicks', () => {
  const makeTicks = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      label: `label-${i}`,
      bucket: D(`2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
    }))

  it('returns empty array for empty data', () => {
    expect(getEvenTicks([], 'day', 5)).toEqual([])
  })

  it('returns all labels when data fits within maxCount', () => {
    const data = makeTicks(5)
    expect(getEvenTicks(data, 'day', 10)).toEqual(data.map((d) => d.label))
  })

  it('returns exactly maxCount evenly-spaced labels when data exceeds maxCount', () => {
    const data = makeTicks(30)
    const ticks = getEvenTicks(data, 'day', 5)
    expect(ticks).toHaveLength(5)
    expect(ticks[0]).toBe('label-0')
    expect(ticks[4]).toBe('label-29')
  })

  it('hour granularity filters to every-N-hour ticks', () => {
    // 24 hourly buckets
    const data = Array.from({ length: 24 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, 1, i, 0, 0))
      return { label: String(i), bucket: d }
    })
    // maxCount = 6 → step = 4 (24/4 = 6 ≤ 6)
    const ticks = getEvenTicks(data, 'hour', 6)
    expect(ticks).toEqual(['0', '4', '8', '12', '16', '20'])
  })
})

describe('formatBucket', () => {
  it('formats hour as HH:MM', () => {
    expect(formatBucket(D('2026-01-01T14:00:00Z'), 'hour', 'en')).toBe('14:00')
  })

  it('formats year as 4-digit year', () => {
    expect(formatBucket(D('2026-01-01T00:00:00Z'), 'year', 'en')).toBe('2026')
  })

  it('formats day as "Jan 5"', () => {
    expect(formatBucket(D('2026-01-05T00:00:00Z'), 'day', 'en')).toBe('Jan 5')
  })

  it('formats week the same as day (start of week)', () => {
    expect(formatBucket(D('2026-01-05T00:00:00Z'), 'week', 'en')).toBe('Jan 5')
  })
})

describe('formatBucketLabel', () => {
  it('week label shows range from Monday to Sunday', () => {
    const label = formatBucketLabel(D('2026-01-05T00:00:00Z'), 'week', 'en')
    expect(label).toContain('Jan 5')
    expect(label).toContain('Jan 11')
  })

  it('non-week delegates to formatBucket', () => {
    expect(formatBucketLabel(D('2026-01-05T00:00:00Z'), 'day', 'en')).toBe('Jan 5')
  })
})

describe('resolveGranularity', () => {
  it('uses default when urlGranularity is undefined', () => {
    expect(resolveGranularity('7d', undefined)).toBe('day')
    expect(resolveGranularity('1y', undefined)).toBe('month')
  })

  it('uses urlGranularity when it is valid for the range', () => {
    expect(resolveGranularity('30d', 'week')).toBe('week')
  })

  it('falls back to default when urlGranularity is not valid for the range', () => {
    // '7d' has no granularity options, so any urlGranularity falls back to default
    expect(resolveGranularity('7d', 'week')).toBe('day')
  })
})

describe('granularityOptionsForWindow', () => {
  it('returns day+week options for a ~30-day window', () => {
    expect(granularityOptionsForWindow('2026-04-27', '2026-05-26')).toEqual(['day', 'week'])
  })

  it('returns week+month options for a ~90-day window', () => {
    expect(granularityOptionsForWindow('2026-02-25', '2026-05-26')).toEqual(['week', 'month'])
  })

  it('returns week+month options for a 365-day window', () => {
    expect(granularityOptionsForWindow('2025-05-27', '2026-05-26')).toEqual(['week', 'month'])
  })

  it('returns null for a window shorter than 14 days', () => {
    expect(granularityOptionsForWindow('2026-05-20', '2026-05-26')).toBeNull()
  })
})
