import { describe, it, expect } from 'vitest'
import { postDetailQueryOptions } from './posts.$postId'

describe('postDetailQueryOptions', () => {
  it('uses correct query key', () => {
    const opts = postDetailQueryOptions('abc-123')
    expect(opts.queryKey).toEqual(['posts', 'abc-123'])
  })
})
