import { describe, it, expect } from 'vitest'
import { profilePostsQueryOptions } from '#/lib/queries/profiles'

describe('profilePostsQueryOptions', () => {
  it('uses correct query key for the given profile id and page', () => {
    const opts = profilePostsQueryOptions('profile-abc', 1)
    expect(opts.queryKey).toEqual([
      'profiles',
      'profile-abc',
      'posts',
      { page: 1, status: 'active', pageSize: 12 },
    ])
  })

  it('uses correct query key for page 2', () => {
    const opts = profilePostsQueryOptions('profile-abc', 2)
    expect(opts.queryKey).toEqual([
      'profiles',
      'profile-abc',
      'posts',
      { page: 2, status: 'active', pageSize: 12 },
    ])
  })

  it('uses correct query key for archived status', () => {
    const opts = profilePostsQueryOptions('profile-abc', 1, 'archived', 6)
    expect(opts.queryKey).toEqual([
      'profiles',
      'profile-abc',
      'posts',
      { page: 1, status: 'archived', pageSize: 6 },
    ])
  })

  it('uses correct query key for banned status', () => {
    const opts = profilePostsQueryOptions('profile-abc', 1, 'banned')
    expect(opts.queryKey).toEqual([
      'profiles',
      'profile-abc',
      'posts',
      { page: 1, status: 'banned', pageSize: 12 },
    ])
  })
})
