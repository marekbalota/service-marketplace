import { describe, it, expect } from 'vitest'
import { buildPageNumbers } from './index'

describe('buildPageNumbers', () => {
  it('returns [1] for a single page', () => {
    expect(buildPageNumbers(1, 1)).toEqual([1])
  })

  it('returns all pages when total is small', () => {
    expect(buildPageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(buildPageNumbers(2, 4)).toEqual([1, 2, 3, 4])
  })

  it('inserts ellipsis for gaps', () => {
    // current=1, total=10: neighbours are 1,2 — gap before 10
    expect(buildPageNumbers(1, 10)).toEqual([1, 2, 'ellipsis', 10])
  })

  it('shows neighbours of the current page', () => {
    // current=5, total=10: 1 … 4,5,6 … 10
    expect(buildPageNumbers(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
  })

  it('includes both ellipses when current is near the end', () => {
    // current=9, total=10: 1 … 8,9,10
    expect(buildPageNumbers(9, 10)).toEqual([1, 'ellipsis', 8, 9, 10])
  })

  it('always includes page 1 and the last page', () => {
    const result = buildPageNumbers(50, 100)
    expect(result[0]).toBe(1)
    expect(result[result.length - 1]).toBe(100)
  })

  it('has no consecutive ellipses', () => {
    const result = buildPageNumbers(5, 10)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i] === 'ellipsis' && result[i + 1] === 'ellipsis').toBe(false)
    }
  })
})
