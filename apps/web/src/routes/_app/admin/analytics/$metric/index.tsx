import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Users, FileText, MessageSquare } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { BackButton } from '#/components/BackButton'
import { adminAnalyticsQueryOptions, rangeToWindow } from '#/lib/queries/admin'
import {
  VALID_METRICS,
  GRANULARITY_OPTIONS,
  METRIC_CONFIG,
  formatBucket,
  getDrillDown,
  granularityOptionsForWindow,
  resolveGranularity,
} from './-utils'
import type { AnalyticsMetric, AnalyticsGranularity } from '#/lib/queries/admin'
import type { GranularityOption, DrillFrame } from './-utils'
import { AnalyticsStatCards } from './-components/AnalyticsStatCards'
import { AnalyticsChartCard } from './-components/AnalyticsChartCard'
import { TopPeriodsCard } from './-components/TopPeriodsCard'
import { InsightsCard } from './-components/InsightsCard'

export const Route = createFileRoute('/_app/admin/analytics/$metric/')({
  validateSearch: z.object({
    range: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
    granularity: z.enum(['day', 'week', 'month', 'year']).optional(),
  }),
  beforeLoad: ({ params }) => {
    if (!VALID_METRICS.includes(params.metric as AnalyticsMetric)) {
      throw redirect({
        to: '/admin/analytics/$metric',
        params: { metric: 'users' },
        search: { range: '30d' },
      })
    }
  },
  loaderDeps: ({ search: { range, granularity } }) => ({ range, granularity }),
  loader: ({ context: { queryClient }, params: { metric }, deps: { range, granularity } }) => {
    const { from, to } = rangeToWindow(range)
    const gran = resolveGranularity(range, granularity)
    void queryClient.prefetchQuery(
      adminAnalyticsQueryOptions(metric as AnalyticsMetric, from, to, gran),
    )
  },
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const { metric } = Route.useParams()
  const { range, granularity: urlGranularity } = Route.useSearch()
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

  function drillLabel(bucket: Date, granularity: AnalyticsGranularity): string {
    if (granularity === 'week') {
      const end = new Date(bucket)
      end.setUTCDate(end.getUTCDate() + 6)
      const fmt = (d: Date) =>
        d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', timeZone: 'UTC' })
      return `${fmt(bucket)} – ${fmt(end)}`
    }
    return formatBucket(bucket, granularity, i18n.language)
  }

  function handleBarClick(barData: unknown) {
    const { bucket } = barData as { bucket: Date }
    const next = getDrillDown(bucket, activeGranularity)
    if (next) {
      setDrillStack((prev) => [...prev, { ...next, label: drillLabel(bucket, activeGranularity) }])
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
        to: '/admin/analytics/$metric',
        params: { metric },
        search: { range, granularity: g },
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
            to: '/admin/analytics/$metric',
            params: { metric: v },
            search: { range },
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
            to: '/admin/analytics/$metric',
            params: { metric },
            search: { range: r },
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
          locale={i18n.language}
        />
        <InsightsCard
          items={items}
          isPending={isPending}
          activeGranularity={activeGranularity}
          typedMetric={typedMetric}
          locale={i18n.language}
        />
      </div>
    </main>
  )
}
