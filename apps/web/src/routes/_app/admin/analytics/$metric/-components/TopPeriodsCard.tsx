import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { formatBucket } from '../-utils'
import type { AnalyticsGranularity } from '#/lib/queries/admin'

type TopPeriodsCardProps = {
  items: Array<{ bucket: Date; count: number }>
  isPending: boolean
  config: { rankBg: string; rankText: string }
  activeGranularity: AnalyticsGranularity
  locale: string
}

export function TopPeriodsCard({
  items,
  isPending,
  config,
  activeGranularity,
  locale,
}: TopPeriodsCardProps) {
  const { t } = useTranslation()
  const topPeriods = [...items].sort((a, b) => b.count - a.count).slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.analytics.topDays')}</CardTitle>
        <CardDescription>{t('admin.analytics.topDaysDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
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
                    {formatBucket(item.bucket, activeGranularity, locale)}
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
