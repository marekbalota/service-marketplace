import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export const rolesQueryOptions = queryOptions({
  queryKey: ['admin', 'roles'],
  queryFn: async () => {
    const { data, error } = await api.admin.roles.get()
    if (error) throw error
    return data ?? []
  },
})

export const adminStatsQueryOptions = queryOptions({
  queryKey: ['admin', 'stats'],
  queryFn: async () => {
    const { data, error } = await api.admin.stats.get()
    if (error) throw error
    return data!
  },
  staleTime: 60 * 1000,
})

export const adminRecentUsersQueryOptions = queryOptions({
  queryKey: ['admin', 'stats', 'recent-users'],
  queryFn: async () => {
    const { data, error } = await api.admin.stats['recent-users'].get()
    if (error) throw error
    return data!
  },
  staleTime: 60 * 1000,
})

export type AnalyticsMetric = 'users' | 'posts' | 'messages'
export type AnalyticsRange = '1d' | '7d' | '30d' | '90d' | '1y' | 'all'
export type AnalyticsGranularity = 'hour' | 'day' | 'week' | 'month' | 'year'

export function rangeToWindow(range: AnalyticsRange): { from: string | undefined; to: string } {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  if (range === 'all') return { from: undefined, to: fmt(today) }
  if (range === '1d') return { from: fmt(today), to: fmt(today) }

  const days: Record<'7d' | '30d' | '90d' | '1y', number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  }
  const from = new Date(today)
  from.setUTCDate(today.getUTCDate() - days[range])
  return { from: fmt(from), to: fmt(today) }
}

export function adminAnalyticsQueryOptions(
  metric: AnalyticsMetric,
  from: string | undefined,
  to: string,
  granularity: AnalyticsGranularity,
) {
  return queryOptions({
    queryKey: ['admin', 'analytics', metric, from, to, granularity] as const,
    queryFn: async () => {
      const { data, error } = await api.admin.analytics[metric].get({
        query: { from, to, granularity },
      })
      if (error) throw error
      return data!
    },
    staleTime: 5 * 60 * 1000,
  })
}

export const adminCategoriesQueryOptions = (params: {
  search: string
  offset: number
  size: number
}) =>
  queryOptions({
    queryKey: ['admin', 'categories', params] as const,
    queryFn: async () => {
      const { data, error } = await api.admin.categories.get({
        query: {
          ...(params.search && { search: params.search }),
          offset: params.offset,
          size: params.size,
        },
      })
      if (error) throw error
      return data!
    },
  })
