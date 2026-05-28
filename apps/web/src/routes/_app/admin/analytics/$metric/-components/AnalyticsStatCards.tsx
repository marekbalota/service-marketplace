import { TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { AnalyticsMetric, AnalyticsGranularity } from '#/lib/queries/admin'
import type { METRIC_CONFIG } from '../-utils'

type MetricConfig = (typeof METRIC_CONFIG)[AnalyticsMetric]

type AnalyticsStatCardsProps = {
  total: number
  items: Array<{ count: number }>
  activeGranularity: AnalyticsGranularity
  isPending: boolean
  config: MetricConfig
}

export function AnalyticsStatCards({
  total,
  items,
  activeGranularity,
  isPending,
  config,
}: AnalyticsStatCardsProps) {
  const { t } = useTranslation()
  const { Icon } = config

  const periodTotal = items.reduce((s, r) => s + r.count, 0)
  const periodAverage = Math.round(periodTotal / (items.length || 1))
  const peakTotal = Math.max(...items.map((i) => i.count), 0)

  const avgLabel = (() => {
    switch (activeGranularity) {
      case 'hour': return t('admin.analytics.hourlyAverage')
      case 'week': return t('admin.analytics.weeklyAverage')
      case 'month': return t('admin.analytics.monthlyAverage')
      case 'year': return t('admin.analytics.yearlyAverage')
      default: return t('admin.analytics.dailyAverage')
    }
  })()

  const peakLabel = (() => {
    switch (activeGranularity) {
      case 'hour': return t('admin.analytics.peakHour')
      case 'week': return t('admin.analytics.peakWeek')
      case 'month': return t('admin.analytics.peakMonth')
      case 'year': return t('admin.analytics.peakYear')
      default: return t('admin.analytics.peakDay')
    }
  })()

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.analytics.total')}</p>
              {isPending ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{total.toLocaleString()}</p>
              )}
            </div>
            <div className={`p-3 ${config.iconBg} rounded-lg`}>
              <Icon className={`size-5 ${config.iconText}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.analytics.periodTotal')}</p>
              {isPending ? (
                <Skeleton className="h-8 w-20 mt-1" />
              ) : (
                <p className="text-2xl font-bold">{periodTotal.toLocaleString()}</p>
              )}
            </div>
            <TrendingUp className="size-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">{avgLabel}</p>
          {isPending ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{periodAverage.toLocaleString()}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="text-sm text-muted-foreground">{peakLabel}</p>
          {isPending ? (
            <Skeleton className="h-8 w-20 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{peakTotal.toLocaleString()}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
