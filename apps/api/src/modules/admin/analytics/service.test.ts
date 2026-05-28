import { describe, it, expect } from 'bun:test'
import { fillGaps } from './service'

const D = (iso: string) => new Date(iso)
const row = (bucket: string, count: number) => ({ bucket, count })

describe('fillGaps', () => {
  it('returns empty array when no rows and no startDate', () => {
    const result = fillGaps([], 'day', null, D('2026-01-08T00:00:00Z'))
    expect(result).toEqual([])
  })

  it('fills daily gaps with zero-count buckets for missing days', () => {
    const rows = [row('2026-01-01 00:00:00', 3), row('2026-01-03 00:00:00', 5)]
    const result = fillGaps(rows, 'day', D('2026-01-01T00:00:00Z'), D('2026-01-04T00:00:00Z'))
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ bucket: D('2026-01-01T00:00:00Z'), count: 3 })
    expect(result[1]).toEqual({ bucket: D('2026-01-02T00:00:00Z'), count: 0 })
    expect(result[2]).toEqual({ bucket: D('2026-01-03T00:00:00Z'), count: 5 })
  })

  it('fills 24 hourly buckets for a single day', () => {
    const result = fillGaps([], 'hour', D('2026-01-01T00:00:00Z'), D('2026-01-02T00:00:00Z'))
    expect(result).toHaveLength(24)
    expect(result[0]!.bucket.getUTCHours()).toBe(0)
    expect(result[23]!.bucket.getUTCHours()).toBe(23)
    result.forEach((r) => expect(r.count).toBe(0))
  })

  it('matches hourly rows by 13-char ISO key', () => {
    const rows = [row('2026-01-01 03:00:00', 7)]
    const result = fillGaps(rows, 'hour', D('2026-01-01T00:00:00Z'), D('2026-01-02T00:00:00Z'))
    expect(result[3]!.count).toBe(7)
    expect(result[0]!.count).toBe(0)
  })

  it('snaps weekly cursor to Monday before startDate', () => {
    // Jan 9, 2026 is a Friday — cursor snaps to Jan 5 (Mon)
    // endDate Jan 12 (exclusive) keeps exactly one weekly bucket
    const rows = [row('2026-01-05 00:00:00', 4)]
    const result = fillGaps(rows, 'week', D('2026-01-09T00:00:00Z'), D('2026-01-12T00:00:00Z'))
    expect(result).toHaveLength(1)
    expect(result[0]!.bucket).toEqual(D('2026-01-05T00:00:00Z'))
    expect(result[0]!.count).toBe(4)
  })

  it('fills monthly gaps for a calendar year', () => {
    const rows = [row('2026-01-01 00:00:00', 1), row('2026-12-01 00:00:00', 2)]
    const result = fillGaps(rows, 'month', D('2026-01-01T00:00:00Z'), D('2027-01-01T00:00:00Z'))
    expect(result).toHaveLength(12)
    expect(result[0]!.count).toBe(1)
    expect(result[11]!.count).toBe(2)
    result.slice(1, 11).forEach((r) => expect(r.count).toBe(0))
  })

  it('fills yearly gaps across multiple years', () => {
    const rows = [row('2024-01-01 00:00:00', 10), row('2026-01-01 00:00:00', 20)]
    const result = fillGaps(rows, 'year', D('2024-01-01T00:00:00Z'), D('2027-01-01T00:00:00Z'))
    expect(result).toHaveLength(3)
    expect(result[0]!.count).toBe(10)
    expect(result[1]!.count).toBe(0)
    expect(result[2]!.count).toBe(20)
  })

  it('uses first row bucket as start when startDate is null', () => {
    const rows = [row('2026-03-01 00:00:00', 5), row('2026-03-03 00:00:00', 2)]
    const result = fillGaps(rows, 'day', null, D('2026-03-04T00:00:00Z'))
    expect(result).toHaveLength(3)
    expect(result[0]!.bucket).toEqual(D('2026-03-01T00:00:00Z'))
  })
})
