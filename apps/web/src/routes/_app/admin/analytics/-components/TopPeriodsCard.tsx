import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { formatBucketLabel } from '../-utils'
import type { AnalyticsGranularity } from '#/lib/queries/admin'

type TopPeriodsCardProps = {
  items: Array<{ bucket: Date; count: number }>
  isPending: boolean
  config: { rankBg: string; rankText: string }
  activeGranularity: AnalyticsGranularity
}

export function TopPeriodsCard({
  items,
  isPending,
  config,
  activeGranularity,
}: TopPeriodsCardProps) {
  const { t, i18n } = useTranslation()
  const topPeriods = [...items].sort((a, b) => b.count - a.count).slice(0, 6)

  const title = (() => {
    switch (activeGranularity) {
      case 'hour': return t('admin.analytics.topHours')
      case 'week': return t('admin.analytics.topWeeks')
      case 'month': return t('admin.analytics.topMonths')
      case 'year': return t('admin.analytics.topYears')
      default: return t('admin.analytics.topDays')
    }
  })()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{t('admin.analytics.topDaysDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {topPeriods.map((item, idx) => (
              <div
                key={item.bucket.toISOString()}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`size-8 rounded-full ${config.rankBg} flex items-center justify-center`}
                  >
                    <span className={`text-xs font-semibold ${config.rankText}`}>#{idx + 1}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatBucketLabel(item.bucket, activeGranularity, i18n.language)}
                  </span>
                </div>
                <span className="text-sm font-bold">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
        </CardContent>
    </Card>
  )
}
