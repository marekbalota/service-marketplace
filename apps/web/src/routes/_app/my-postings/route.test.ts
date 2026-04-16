import { describe, it, expect } from 'vitest'
import { myPostingsQueryOptions } from './route'

describe('myPostingsQueryOptions', () => {
  it('uses correct query key for the given profile id and page', () => {
    const opts = myPostingsQueryOptions('profile-abc', 1)
    expect(opts.queryKey).toEqual(['profiles', 'profile-abc', 'posts', { page: 1 }])
  })

  it('uses correct query key for page 2', () => {
    const opts = myPostingsQueryOptions('profile-abc', 2)
    expect(opts.queryKey).toEqual(['profiles', 'profile-abc', 'posts', { page: 2 }])
  })
})
