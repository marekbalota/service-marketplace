import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { formatBucket } from '../-utils'
import type { AnalyticsMetric, AnalyticsGranularity } from '#/lib/queries/admin'

type InsightsCardProps = {
  items: Array<{ bucket: Date; count: number }>
  isPending: boolean
  activeGranularity: AnalyticsGranularity
  typedMetric: AnalyticsMetric
  locale: string
}

export function InsightsCard({
  items,
  isPending,
  activeGranularity,
  typedMetric,
  locale,
}: InsightsCardProps) {
  const { t } = useTranslation()

  const periodAverage = Math.round(
    items.reduce((s, r) => s + r.count, 0) / (items.length || 1),
  )
  const peakItem = items.reduce<(typeof items)[0] | undefined>(
    (max, i) => (!max || i.count > max.count ? i : max),
    undefined,
  )
  const growthTrend = (() => {
    if (items.length < 14) return null
    const last7 = items.slice(-7).reduce((s, r) => s + r.count, 0)
    const prev7 = items.slice(-14, -7).reduce((s, r) => s + r.count, 0)
    if (prev7 === 0) return null
    return Math.round(((last7 - prev7) / prev7) * 100)
  })()

  const perLabel = (() => {
    switch (activeGranularity) {
      case 'hour': return t('admin.analytics.perHour')
      case 'week': return t('admin.analytics.perWeek')
      case 'month': return t('admin.analytics.perMonth')
      case 'year': return t('admin.analytics.perYear')
      default: return t('admin.analytics.perDay')
    }
  })()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.analytics.insightsTitle')}</CardTitle>
        <CardDescription>{t('admin.analytics.insightsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {growthTrend !== null && (
              <div className="flex items-start gap-3">
                <div className="size-2 bg-green-500 rounded-full mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {t('admin.analytics.insights.growthTrend')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {growthTrend >= 0 ? '+' : ''}
                    {growthTrend}% {t('admin.analytics.insights.vsLastPeriods')}
                  </p>
                </div>
              </div>
            )}
            {peakItem && (
              <div className="flex items-start gap-3">
                <div className="size-2 bg-blue-500 rounded-full mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {t('admin.analytics.insights.peakActivity')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.analytics.insights.highestOn')}{' '}
                    {formatBucket(peakItem.bucket, activeGranularity, locale)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="size-2 bg-purple-500 rounded-full mt-2 shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {t('admin.analytics.insights.consistency')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('admin.analytics.insights.averageOf')} {periodAverage}{' '}
                  {t(`admin.analytics.${typedMetric}.label`).toLowerCase()} {perLabel}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
