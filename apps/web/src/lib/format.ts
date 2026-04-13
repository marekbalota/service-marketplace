/**
 * Formats a location object into a human-readable string following the
 * hierarchy: country, region, city, street, houseNumber.
 * Only non-empty fields are included.
 */
export function formatLocation(loc: {
  country?: string | null
  region?: string | null
  city?: string | null
  street?: string | null
  houseNumber?: string | null
}): string {
  return [loc.country, loc.region, loc.city, loc.street, loc.houseNumber]
    .filter(Boolean)
    .join(', ')
}
