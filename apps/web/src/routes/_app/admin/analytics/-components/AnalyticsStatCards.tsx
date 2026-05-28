import { TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StatCard } from '../../-components/StatCard'
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

  const periodTotal = items.reduce((s, r) => s + r.count, 0)
  const periodAverage = parseFloat((periodTotal / (items.length || 1)).toFixed(1))
  const peakTotal = Math.max(...items.map((i) => i.count), 0)

  const avgLabel = (() => {
    switch (activeGranularity) {
      case 'hour':
        return t('admin.analytics.hourlyAverage')
      case 'week':
        return t('admin.analytics.weeklyAverage')
      case 'month':
        return t('admin.analytics.monthlyAverage')
      case 'year':
        return t('admin.analytics.yearlyAverage')
      default:
        return t('admin.analytics.dailyAverage')
    }
  })()

  const peakLabel = (() => {
    switch (activeGranularity) {
      case 'hour':
        return t('admin.analytics.peakHour')
      case 'week':
        return t('admin.analytics.peakWeek')
      case 'month':
        return t('admin.analytics.peakMonth')
      case 'year':
        return t('admin.analytics.peakYear')
      default:
        return t('admin.analytics.peakDay')
    }
  })()

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        label={t('admin.analytics.total')}
        value={total.toLocaleString()}
        isPending={isPending}
        icon={config.Icon}
        iconBg={config.iconBg}
        iconText={config.iconText}
      />
      <StatCard
        label={t('admin.analytics.periodTotal')}
        value={periodTotal.toLocaleString()}
        isPending={isPending}
        icon={TrendingUp}
        iconBg={config.iconBg}
        iconText={config.iconText}
      />
      <StatCard label={avgLabel} value={periodAverage.toLocaleString()} isPending={isPending} />
      <StatCard label={peakLabel} value={peakTotal.toLocaleString()} isPending={isPending} />
    </div>
  )
}
