import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { Permissions, hasPermissions } from '@marketplace/shared'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Users, FileText, MessageSquare } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { BackButton } from '#/components/BackButton'
import { adminAnalyticsQueryOptions, rangeToWindow } from '#/lib/queries/admin'
import {
  GRANULARITY_OPTIONS,
  METRIC_CONFIG,
  formatBucket,
  formatBucketLabel,
  getDrillDown,
  getPreviousWindow,
  granularityOptionsForWindow,
  resolveGranularity,
} from './-utils'
import type { AnalyticsMetric, AnalyticsGranularity } from '#/lib/queries/admin'
import type { GranularityOption, DrillFrame } from './-utils'
import { AnalyticsStatCards } from './-components/AnalyticsStatCards'
import { AnalyticsChartCard } from './-components/AnalyticsChartCard'
import { TopPeriodsCard } from './-components/TopPeriodsCard'
import { PeriodComparisonCard } from './-components/PeriodComparisonCard'

export const Route = createFileRoute('/_app/admin/analytics/')({
  beforeLoad: ({ context: { user } }) => {
    const permissions = user?.role?.permissions ?? []
    if (!hasPermissions(permissions, [Permissions.AdminAnalyticsView])) {
      throw redirect({ to: '/admin' })
    }
  },
  validateSearch: z.object({
    metric: z.enum(['users', 'posts', 'messages']).default('users'),
    range: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
    granularity: z.enum(['day', 'week', 'month', 'year']).optional(),
  }),
  loaderDeps: ({ search: { metric, range, granularity } }) => ({ metric, range, granularity }),
  loader: ({ context: { queryClient }, deps: { metric, range, granularity } }) => {
    const { from, to } = rangeToWindow(range)
    const gran = resolveGranularity(range, granularity)
    void queryClient.prefetchQuery(
      adminAnalyticsQueryOptions(metric as AnalyticsMetric, from, to, gran),
    )
    const prevWindow = getPreviousWindow(from, to)
    if (prevWindow) {
      void queryClient.prefetchQuery(
        adminAnalyticsQueryOptions(metric as AnalyticsMetric, prevWindow.from, prevWindow.to, gran),
      )
    }
  },
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const { metric, range, granularity: urlGranularity } = Route.useSearch()
  const navigate = useNavigate()
  const typedMetric = metric as AnalyticsMetric
  const config = METRIC_CONFIG[typedMetric]

  const [drillStack, setDrillStack] = useState<DrillFrame[]>([])

  useEffect(() => {
    setDrillStack([])
  }, [typedMetric, range])

  const topGranularity: AnalyticsGranularity = resolveGranularity(range, urlGranularity)

  const { from: topFrom, to: topTo } = rangeToWindow(range)
  const activeFrame = drillStack.at(-1)
  const activeFrom = activeFrame?.from ?? topFrom
  const activeTo = activeFrame?.to ?? topTo
  const activeGranularity = activeFrame?.granularity ?? topGranularity
  const isDrilling = drillStack.length > 0

  const { data, isPending } = useQuery(
    adminAnalyticsQueryOptions(typedMetric, activeFrom, activeTo, activeGranularity),
  )

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const chartData = items.map((item) => ({
    ...item,
    label: formatBucket(item.bucket, activeGranularity, i18n.language),
  }))

  const visibleGranularityOptions = isDrilling
    ? activeFrame
      ? granularityOptionsForWindow(activeFrame.from, activeFrame.to)
      : null
    : GRANULARITY_OPTIONS[range]

  function handleBarClick(barData: unknown) {
    const { bucket } = barData as { bucket: Date }
    const next = getDrillDown(bucket, activeGranularity)
    if (next) {
      setDrillStack((prev) => [
        ...prev,
        { ...next, label: formatBucketLabel(bucket, activeGranularity, i18n.language) },
      ])
    }
  }

  function handleGranularityChange(g: GranularityOption) {
    if (isDrilling) {
      setDrillStack((prev) => {
        const last = prev.at(-1)
        if (!last) return prev
        return [...prev.slice(0, -1), { ...last, granularity: g }]
      })
    } else {
      navigate({
        to: '/admin/analytics',
        search: (prev) => ({ ...prev, granularity: g }),
        replace: true,
      })
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin' })} label={t('admin.backToAdmin')} />

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">{t(`admin.analytics.${typedMetric}.title`)}</h2>
        <p className="text-muted-foreground">{t(`admin.analytics.${typedMetric}.description`)}</p>
      </div>

      <Tabs
        value={typedMetric}
        onValueChange={(v) =>
          navigate({
            to: '/admin/analytics',
            search: (prev) => ({ ...prev, metric: v as AnalyticsMetric, granularity: undefined }),
            replace: true,
          })
        }
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="size-4" />
            {t('admin.analytics.usersTab')}
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-2">
            <FileText className="size-4" />
            {t('admin.analytics.postsTab')}
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="size-4" />
            {t('admin.analytics.messagesTab')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <AnalyticsStatCards
        total={total}
        items={items}
        activeGranularity={activeGranularity}
        isPending={isPending}
        config={config}
      />

      <AnalyticsChartCard
        range={range}
        typedMetric={typedMetric}
        isDrilling={isDrilling}
        drillStack={drillStack}
        activeGranularity={activeGranularity}
        visibleGranularityOptions={visibleGranularityOptions}
        chartData={chartData}
        isPending={isPending}
        color={config.color}
        onBarClick={handleBarClick}
        onGranularityChange={handleGranularityChange}
        onPopAll={() => setDrillStack([])}
        onPopToIndex={(idx) => setDrillStack((prev) => prev.slice(0, idx + 1))}
        onRangeChange={(r) =>
          navigate({
            to: '/admin/analytics',
            search: (prev) => ({ ...prev, range: r, granularity: undefined }),
            replace: true,
          })
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopPeriodsCard
          items={items}
          isPending={isPending}
          config={config}
          activeGranularity={activeGranularity}
        />
        <PeriodComparisonCard
          items={items}
          activeFrom={activeFrom}
          activeTo={activeTo}
          activeGranularity={activeGranularity}
          typedMetric={typedMetric}
          isPending={isPending}
        />
      </div>
    </main>
  )
}
