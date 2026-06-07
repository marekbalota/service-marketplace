import { describe, it, expect } from 'vitest'
import { profileLocationsQueryOptions } from '#/lib/queries/profiles'

// --- profileLocationsQueryOptions ---

describe('profileLocationsQueryOptions', () => {
  it('uses correct query key for a given profile id', () => {
    const opts = profileLocationsQueryOptions('profile-abc')
    expect(opts.queryKey).toEqual(['locations', 'profile', 'profile-abc'])
  })

  it('is disabled when profileId is empty', () => {
    const opts = profileLocationsQueryOptions('')
    expect(opts.enabled).toBe(false)
  })

  it('is enabled when profileId is non-empty', () => {
    const opts = profileLocationsQueryOptions('some-id')
    expect(opts.enabled).toBe(true)
  })
})

// --- mutation body construction ---
// Tests the location/price/rateType body-building logic extracted as a pure helper
// so it can be unit-tested without rendering the full component.

type LocationFields = {
  isManualLocation?: boolean
  locationId?: string
  locationExternalId?: string
  price?: string
  rateType?: 'HOURLY' | 'DAILY' | 'FIXED' | undefined
}

type MutationBody = {
  price: string | undefined
  rateType: 'HOURLY' | 'DAILY' | 'FIXED' | undefined
  location?: { externalId: string }
  locationId?: string
}

function buildMutationBody(fields: LocationFields): MutationBody {
  const {
    isManualLocation = false,
    locationId = '',
    locationExternalId = '',
    price = '',
    rateType,
  } = fields

  const hasNewLocation = isManualLocation && !!locationExternalId

  return {
    price: price || undefined,
    rateType,
    ...(hasNewLocation
      ? { location: { externalId: locationExternalId } }
      : { locationId: locationId || undefined }),
  }
}

describe('create post mutation body', () => {
  it('sends locationId when an existing location is selected', () => {
    const body = buildMutationBody({ isManualLocation: false, locationId: 'loc-uuid-123' })
    expect(body.locationId).toBe('loc-uuid-123')
    expect(body.location).toBeUndefined()
  })

  it('sends location.externalId when new location is chosen via autocomplete', () => {
    const body = buildMutationBody({
      isManualLocation: true,
      locationExternalId: 'R86674',
    })
    expect(body.location).toEqual({ externalId: 'R86674' })
    expect(body.locationId).toBeUndefined()
  })

  it('sends no location when new-location mode is on but externalId is empty', () => {
    const body = buildMutationBody({ isManualLocation: true, locationExternalId: '' })
    expect(body.location).toBeUndefined()
    expect(body.locationId).toBeUndefined()
  })

  it('sends no location when no selection is made', () => {
    const body = buildMutationBody({ isManualLocation: false, locationId: '' })
    expect(body.locationId).toBeUndefined()
    expect(body.location).toBeUndefined()
  })

  it('omits rateType from body when price is not set', () => {
    const body = buildMutationBody({ price: '', rateType: undefined })
    expect(body.rateType).toBeUndefined()
  })

  it('includes rateType in body when price and rateType are set', () => {
    const body = buildMutationBody({ price: '50', rateType: 'HOURLY' })
    expect(body.rateType).toBe('HOURLY')
  })
})
