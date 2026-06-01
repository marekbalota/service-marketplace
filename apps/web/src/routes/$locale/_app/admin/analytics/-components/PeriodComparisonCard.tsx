import { TrendingUp, TrendingDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { adminAnalyticsQueryOptions } from '#/lib/queries/admin'
import { getPreviousWindow } from '../-utils'
import type { AnalyticsMetric, AnalyticsGranularity } from '#/lib/queries/admin'

type PeriodComparisonCardProps = {
  items: Array<{ count: number }>
  activeFrom: string | undefined
  activeTo: string
  activeGranularity: AnalyticsGranularity
  typedMetric: AnalyticsMetric
  isPending: boolean
}

function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null
  return parseFloat((((current - prev) / prev) * 100).toFixed(1))
}

function ChangeIndicator({ pct }: { pct: number | null }) {
  if (pct === null) return null
  const positive = pct >= 0
  return (
    <div
      className={`flex items-center gap-1 ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
    >
      {positive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
      <span className="text-sm font-semibold">
        {positive ? '+' : ''}
        {pct}%
      </span>
    </div>
  )
}

function ComparisonSection({
  label,
  current,
  prev,
  isPending,
}: {
  label: string
  current: number
  prev: number | undefined
  isPending: boolean
}) {
  const { t } = useTranslation()
  const pct = prev !== undefined ? pctChange(current, prev) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {isPending ? <Skeleton className="h-4 w-14" /> : <ChangeIndicator pct={pct} />}
      </div>
      <div className="flex items-end justify-between">
        <div>
          {isPending ? (
            <>
              <Skeleton className="h-6 w-14 mb-1" />
              <Skeleton className="h-3 w-20" />
            </>
          ) : (
            <>
              <p className="text-lg font-bold">{current.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.comparison.currentPeriod')}
              </p>
            </>
          )}
        </div>
        <div className="text-right">
          {isPending ? (
            <>
              <Skeleton className="h-4 w-12 mb-1 ml-auto" />
              <Skeleton className="h-3 w-24 ml-auto" />
            </>
          ) : prev !== undefined ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">{prev.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.comparison.previousPeriod')}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function PeriodComparisonCard({
  items,
  activeFrom,
  activeTo,
  activeGranularity,
  typedMetric,
  isPending,
}: PeriodComparisonCardProps) {
  const { t } = useTranslation()

  const prevWindow = getPreviousWindow(activeFrom, activeTo)

  const { data: prevData, isPending: isPrevPending } = useQuery({
    ...adminAnalyticsQueryOptions(
      typedMetric,
      prevWindow?.from,
      prevWindow?.to ?? activeTo,
      activeGranularity,
    ),
    enabled: !!prevWindow,
  })

  const periodTotal = items.reduce((s, r) => s + r.count, 0)
  const periodAvg = parseFloat((periodTotal / (items.length || 1)).toFixed(1))
  const periodPeak = Math.max(...items.map((i) => i.count), 0)

  const prevItems = prevData?.items ?? []
  const prevTotal = prevItems.reduce((s, r) => s + r.count, 0)
  const prevAvg = parseFloat((prevTotal / (prevItems.length || 1)).toFixed(1))
  const prevPeak = Math.max(...prevItems.map((i) => i.count), 0)

  const rowIsPending = isPending || isPrevPending
  const hasPrev = !!prevWindow

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.analytics.comparison.title')}</CardTitle>
        <CardDescription>{t('admin.analytics.comparison.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPrev ? (
          <p className="text-sm text-muted-foreground">
            {t('admin.analytics.comparison.noComparison')}
          </p>
        ) : (
          <div className="space-y-4">
            <ComparisonSection
              label={t('admin.analytics.comparison.periodTotal')}
              current={periodTotal}
              prev={prevTotal}
              isPending={rowIsPending}
            />
            <div className="border-t pt-4 space-y-4">
              <ComparisonSection
                label={t('admin.analytics.comparison.peak')}
                current={periodPeak}
                prev={prevPeak}
                isPending={rowIsPending}
              />
              <div className="border-t pt-4">
                <ComparisonSection
                  label={t('admin.analytics.comparison.average')}
                  current={periodAvg}
                  prev={prevAvg}
                  isPending={rowIsPending}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
