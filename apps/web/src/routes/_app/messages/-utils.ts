type TranslateFn = (key: string, opts?: Record<string, unknown>) => string

export function formatRelativeTime(date: Date | string, t: TranslateFn): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return t('messages.justNow')
  if (seconds < 3600) return t('messages.minutesAgo', { count: Math.floor(seconds / 60) })
  if (seconds < 86400) return t('messages.hoursAgo', { count: Math.floor(seconds / 3600) })
  return t('messages.daysAgo', { count: Math.floor(seconds / 86400) })
}
