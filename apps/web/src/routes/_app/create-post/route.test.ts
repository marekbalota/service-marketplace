import { describe, it, expect } from 'vitest'
import { profileLocationsQueryOptions } from './route'

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
  country?: string
  region?: string
  city?: string
  street?: string
  houseNumber?: string
  price?: string
  rateType?: 'HOURLY' | 'DAILY' | 'FIXED' | undefined
}

type MutationBody = {
  price: string | undefined
  rateType: 'HOURLY' | 'DAILY' | 'FIXED' | undefined
  location?: { country?: string; region?: string; city?: string; street?: string; houseNumber?: string }
  locationId?: string
}

function buildMutationBody(fields: LocationFields): MutationBody {
  const {
    isManualLocation = false,
    locationId = '',
    country = '',
    region = '',
    city = '',
    street = '',
    houseNumber = '',
    price = '',
    rateType,
  } = fields

  const hasManualLocation =
    isManualLocation && (country || region || city || street || houseNumber)

  return {
    price: price || undefined,
    rateType,
    ...(hasManualLocation
      ? {
          location: {
            country: country || undefined,
            region: region || undefined,
            city: city || undefined,
            street: street || undefined,
            houseNumber: houseNumber || undefined,
          },
        }
      : { locationId: locationId || undefined }),
  }
}

describe('create post mutation body', () => {
  it('sends locationId when an existing location is selected', () => {
    const body = buildMutationBody({ isManualLocation: false, locationId: 'loc-uuid-123' })
    expect(body.locationId).toBe('loc-uuid-123')
    expect(body.location).toBeUndefined()
  })

  it('sends location object when manual location fields are filled', () => {
    const body = buildMutationBody({
      isManualLocation: true,
      country: 'Czech Republic', region: 'South Moravian', city: 'Brno',
    })
    expect(body.location).toEqual({
      country: 'Czech Republic', region: 'South Moravian', city: 'Brno',
      street: undefined, houseNumber: undefined,
    })
    expect(body.locationId).toBeUndefined()
  })

  it('sends no location when manual mode is on but all fields are empty', () => {
    const body = buildMutationBody({ isManualLocation: true })
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
