import { describe, it, expect } from 'vitest'
import { profileQueryOptions, imagesQueryOptions } from './profileQueries'

describe('profileQueryOptions', () => {
  it('sets the correct query key for a given profileId', () => {
    const opts = profileQueryOptions('profile-123')
    expect(opts.queryKey).toEqual(['profiles', 'profile-123'])
  })

  it('returns different query keys for different profileIds', () => {
    const a = profileQueryOptions('profile-1')
    const b = profileQueryOptions('profile-2')
    expect(a.queryKey).not.toEqual(b.queryKey)
  })

  it('has a queryFn', () => {
    const opts = profileQueryOptions('profile-123')
    expect(typeof opts.queryFn).toBe('function')
  })
})

describe('imagesQueryOptions', () => {
  it('sets the correct query key for a given profileId', () => {
    const opts = imagesQueryOptions('profile-123')
    expect(opts.queryKey).toEqual(['profiles', 'profile-123', 'images'])
  })

  it('returns different query keys for different profileIds', () => {
    const a = imagesQueryOptions('profile-1')
    const b = imagesQueryOptions('profile-2')
    expect(a.queryKey).not.toEqual(b.queryKey)
  })

  it('has a queryFn', () => {
    const opts = imagesQueryOptions('profile-123')
    expect(typeof opts.queryFn).toBe('function')
  })
})
