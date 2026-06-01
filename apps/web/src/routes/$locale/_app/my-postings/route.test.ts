import { describe, it, expect } from 'vitest'
import { profilePostsQueryOptions } from '#/lib/queries/profiles'

describe('profilePostsQueryOptions', () => {
  it('uses correct query key for the given profile id and page', () => {
    const opts = profilePostsQueryOptions('profile-abc', 1)
    expect(opts.queryKey).toEqual([
      'profiles',
      'profile-abc',
      'posts',
      { page: 1, archived: false, pageSize: 12 },
    ])
  })

  it('uses correct query key for page 2', () => {
    const opts = profilePostsQueryOptions('profile-abc', 2)
    expect(opts.queryKey).toEqual([
      'profiles',
      'profile-abc',
      'posts',
      { page: 2, archived: false, pageSize: 12 },
    ])
  })

  it('uses custom pageSize in query key', () => {
    const opts = profilePostsQueryOptions('profile-abc', 1, false, 6)
    expect(opts.queryKey).toEqual([
      'profiles',
      'profile-abc',
      'posts',
      { page: 1, archived: false, pageSize: 6 },
    ])
  })
})
