import { describe, it, expect } from 'vitest'
import { myPostingsQueryOptions } from './route'

describe('myPostingsQueryOptions', () => {
  it('uses correct query key for the given profile id', () => {
    const opts = myPostingsQueryOptions('profile-abc')
    expect(opts.queryKey).toEqual(['profiles', 'profile-abc', 'posts'])
  })
})
