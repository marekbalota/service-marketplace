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
  return [loc.country, loc.region, loc.city, loc.street, loc.houseNumber].filter(Boolean).join(', ')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
