import { Users, FileText, MessageSquare } from 'lucide-react'
import type { AnalyticsMetric, AnalyticsRange, AnalyticsGranularity } from '#/lib/queries/admin'

export type GranularityOption = Exclude<AnalyticsGranularity, 'hour'>

export type DrillFrame = {
  from: string
  to: string
  granularity: AnalyticsGranularity
  label: string
}

const MS_PER_DAY = 86_400_000

export const UI_RANGES: AnalyticsRange[] = ['7d', '30d', '90d', '1y', 'all']

export const DEFAULT_GRANULARITY: Record<AnalyticsRange, AnalyticsGranularity> = {
  '1d': 'hour',
  '7d': 'day',
  '30d': 'day',
  '90d': 'week',
  '1y': 'month',
  all: 'year',
}

export const GRANULARITY_OPTIONS: Partial<Record<AnalyticsRange, GranularityOption[]>> = {
  '30d': ['day', 'week'],
  '90d': ['week', 'month'],
  '1y': ['week', 'month'],
  all: ['year', 'month'],
}

export const TICK_SLOT_PX: Record<AnalyticsGranularity, number> = {
  hour: 42,
  day: 72,
  week: 72,
  month: 92,
  year: 60,
}

export const METRIC_CONFIG = {
  users: {
    Icon: Users,
    color: '#3b82f6',
    iconBg: 'bg-blue-100 dark:bg-blue-500/20',
    iconText: 'text-blue-600 dark:text-blue-300',
    rankBg: 'bg-blue-100 dark:bg-blue-500/20',
    rankText: 'text-blue-600 dark:text-blue-300',
  },
  posts: {
    Icon: FileText,
    color: '#22c55e',
    iconBg: 'bg-green-100 dark:bg-green-500/20',
    iconText: 'text-green-600 dark:text-green-300',
    rankBg: 'bg-green-100 dark:bg-green-500/20',
    rankText: 'text-green-600 dark:text-green-300',
  },
  messages: {
    Icon: MessageSquare,
    color: '#a855f7',
    iconBg: 'bg-purple-100 dark:bg-purple-500/20',
    iconText: 'text-purple-600 dark:text-purple-300',
    rankBg: 'bg-purple-100 dark:bg-purple-500/20',
    rankText: 'text-purple-600 dark:text-purple-300',
  },
} as const

export function formatBucket(d: Date, granularity: AnalyticsGranularity, locale = 'en'): string {
  if (granularity === 'hour') {
    return d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    })
  }
  if (granularity === 'year') return String(d.getUTCFullYear())
  if (granularity === 'month') {
    return d.toLocaleDateString(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function formatBucketLabel(
  d: Date,
  granularity: AnalyticsGranularity,
  locale = 'en',
): string {
  if (granularity === 'week') {
    const end = new Date(d)
    end.setUTCDate(end.getUTCDate() + 6)
    const fmt = (date: Date) =>
      date.toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    return `${fmt(d)} – ${fmt(end)}`
  }
  return formatBucket(d, granularity, locale)
}

export function getDrillDown(
  bucket: Date,
  granularity: AnalyticsGranularity,
): { from: string; to: string; granularity: AnalyticsGranularity } | null {
  switch (granularity) {
    case 'year': {
      const year = bucket.getUTCFullYear()
      return { from: `${year}-01-01`, to: `${year}-12-31`, granularity: 'month' }
    }
    case 'month': {
      const from = new Date(Date.UTC(bucket.getUTCFullYear(), bucket.getUTCMonth(), 1))
        .toISOString()
        .slice(0, 10)
      const to = new Date(Date.UTC(bucket.getUTCFullYear(), bucket.getUTCMonth() + 1, 0))
        .toISOString()
        .slice(0, 10)
      return { from, to, granularity: 'week' }
    }
    case 'week': {
      const from = bucket.toISOString().slice(0, 10)
      const end = new Date(bucket)
      end.setUTCDate(end.getUTCDate() + 6)
      const to = end.toISOString().slice(0, 10)
      return { from, to, granularity: 'day' }
    }
    case 'day': {
      const from = bucket.toISOString().slice(0, 10)
      return { from, to: from, granularity: 'hour' }
    }
    case 'hour':
      return null
  }
}

export function resolveGranularity(
  range: AnalyticsRange,
  urlGranularity: GranularityOption | undefined,
): AnalyticsGranularity {
  if (!urlGranularity) return DEFAULT_GRANULARITY[range]
  const options = GRANULARITY_OPTIONS[range]
  if (!options) return DEFAULT_GRANULARITY[range]
  return (options as string[]).includes(urlGranularity)
    ? urlGranularity
    : DEFAULT_GRANULARITY[range]
}

export function getPreviousWindow(
  from: string | undefined,
  to: string,
): { from: string; to: string } | null {
  if (!from) return null
  const fromDate = new Date(from + 'T00:00:00Z')
  const toDate = new Date(to + 'T00:00:00Z')
  const windowDays = Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY) + 1
  const prevTo = new Date(fromDate)
  prevTo.setUTCDate(prevTo.getUTCDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (windowDays - 1))
  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  }
}

export function granularityOptionsForWindow(from: string, to: string): GranularityOption[] | null {
  const days =
    Math.round(
      (new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()) /
        MS_PER_DAY,
    ) + 1
  if (days >= 365) return GRANULARITY_OPTIONS['1y']!
  if (days >= 60) return GRANULARITY_OPTIONS['90d']!
  if (days >= 14) return GRANULARITY_OPTIONS['30d']!
  return null
}

export function getEvenTicks(
  data: Array<{ label: string; bucket: Date }>,
  granularity: AnalyticsGranularity,
  maxCount: number,
): string[] {
  if (data.length === 0) return []
  if (granularity === 'hour') {
    const step = [1, 2, 3, 4, 6, 8, 12].find((s) => 24 / s <= maxCount) ?? 4
    return data.filter((d) => d.bucket.getUTCHours() % step === 0).map((d) => d.label)
  }
  if (data.length <= maxCount) return data.map((d) => d.label)
  const indexStep = (data.length - 1) / (maxCount - 1)
  return Array.from({ length: maxCount }, (_, i) => data[Math.round(i * indexStep)]!.label)
}
