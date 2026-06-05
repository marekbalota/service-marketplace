import type { TFunction } from 'i18next'

export interface LocationFields {
  country?: string | null
  region?: string | null
  city?: string | null
  street?: string | null
}

export function formatLocation(loc: LocationFields): string {
  const uniqueRegion = loc.region !== loc.city ? loc.region : null
  return [loc.street, loc.city, uniqueRegion, loc.country].filter(Boolean).join(', ')
}

export function formatLocationDetail(
  loc: Pick<LocationFields, 'country' | 'region' | 'city'>,
  t: TFunction,
): string {
  return [
    loc.country && `${t('profiles.location.country')}: ${loc.country}`,
    loc.region && `• ${t('profiles.location.region')}: ${loc.region}`,
    loc.city && `• ${t('profiles.location.city')}: ${loc.city}`,
  ]
    .filter(Boolean)
    .join(' ')
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
