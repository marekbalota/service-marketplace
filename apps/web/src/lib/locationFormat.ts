export interface LocationFields {
  country: string | null
  region: string | null
  city: string | null
  street: string | null
  houseNumber: string | null
}

export function formatLocationDisplayName(loc: LocationFields): string {
  return (
    [loc.street, loc.houseNumber, loc.city, loc.region, loc.country].filter(Boolean).join(', ') ||
    'Unknown location'
  )
}

export function formatLocationDetail(
  loc: Pick<LocationFields, 'country' | 'region' | 'city'>,
): string {
  return [
    loc.country && `Country: ${loc.country}`,
    loc.region && `• Region: ${loc.region}`,
    loc.city && `• City: ${loc.city}`,
  ]
    .filter(Boolean)
    .join(' ')
}
