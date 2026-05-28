import type { TFunction } from 'i18next'

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

export function formatRelativeTime(date: Date | string, t: TFunction): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return t('common.justNow')
  if (seconds < 3600) return t('common.minutesAgo', { count: Math.floor(seconds / 60) })
  if (seconds < 86400) return t('common.hoursAgo', { count: Math.floor(seconds / 3600) })
  return t('common.daysAgo', { count: Math.floor(seconds / 86400) })
}
