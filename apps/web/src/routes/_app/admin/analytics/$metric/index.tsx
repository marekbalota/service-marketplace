import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useState, useEffect, useRef, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Users, FileText, MessageSquare, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { cn } from '#/lib/utils'
import { BackButton } from '#/components/BackButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#/components/ui/chart'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb'
import {
  adminAnalyticsQueryOptions,
  rangeToWindow,
  type AnalyticsMetric,
  type AnalyticsRange,
  type AnalyticsGranularity,
} from '#/lib/queries/admin'

const VALID_METRICS: AnalyticsMetric[] = ['users', 'posts', 'messages']
const UI_RANGES: AnalyticsRange[] = ['7d', '30d', '90d', '1y', 'all']

const DEFAULT_GRANULARITY: Record<AnalyticsRange, AnalyticsGranularity> = {
  '1d': 'hour',
  '7d': 'day',
  '30d': 'day',
  '90d': 'week',
  '1y': 'month',
  all: 'year',
}

type GranularityOption = Exclude<AnalyticsGranularity, 'hour'>

// Ranges that offer a user-selectable granularity control
const GRANULARITY_OPTIONS: Partial<Record<AnalyticsRange, GranularityOption[]>> = {
  '30d': ['day', 'week'],
  '90d': ['week', 'month'],
  '1y': ['week', 'month'],
  all: ['year', 'month'],
}

// Approximate rendered width (px) of one tick label including its minimum gap
const TICK_SLOT_PX: Record<AnalyticsGranularity, number> = {
  hour: 42,
  day: 72,
  week: 72,
  month: 92,
  year: 60,
}

const METRIC_CONFIG = {
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
  component: AnalyticsPage,
})

type DrillFrame = {
  from: string
  to: string
  granularity: AnalyticsGranularity
  label: string
}

function formatBucket(
  d: Date,
  granularity: AnalyticsGranularity,
  locale: string = 'en',
): string {
  if (granularity === 'hour') {
    return d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    })
  }
  if (granularity === 'year') {
    return String(d.getUTCFullYear())
  }
  if (granularity === 'month') {
    return d.toLocaleDateString(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  // day or week: show "May 5"
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function getDrillDown(
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
      const to = new Date(bucket.getTime() + 6 * 86400000).toISOString().slice(0, 10)
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

function granularityOptionsForWindow(from: string, to: string): GranularityOption[] | null {
  const days =
    Math.round(
      (new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()) /
        86400000,
    ) + 1
  if (days >= 365) return ['month', 'year']
  if (days >= 60) return ['week', 'month']
  if (days >= 14) return ['day', 'week']
  return null
}

function getEvenTicks(
  data: Array<{ label: string; bucket: Date }>,
  granularity: AnalyticsGranularity,
  maxCount: number,
): string[] {
  if (data.length === 0) return []
  if (granularity === 'hour') {
    // Snap to clock-aligned intervals that divide 24 evenly
    const step = [1, 2, 3, 4, 6, 8, 12].find((s) => 24 / s <= maxCount) ?? 4
    return data.filter((d) => d.bucket.getUTCHours() % step === 0).map((d) => d.label)
  }
  if (data.length <= maxCount) return data.map((d) => d.label)
  const indexStep = (data.length - 1) / (maxCount - 1)
  return Array.from({ length: maxCount }, (_, i) => data[Math.round(i * indexStep)]!.label)
}

function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const { metric } = Route.useParams()
  const { range, granularity: urlGranularity } = Route.useSearch()
  const navigate = useNavigate()
  const typedMetric = metric as AnalyticsMetric
  const config = METRIC_CONFIG[typedMetric]
  const { Icon } = config

  const [drillStack, setDrillStack] = useState<DrillFrame[]>([])
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(700)

  useEffect(() => {
    setDrillStack([])
  }, [typedMetric, range])

  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setChartWidth(entry!.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Resolve top-level granularity: use URL param if valid for this range, else default
  const topGranularity: AnalyticsGranularity = (() => {
    if (!urlGranularity) return DEFAULT_GRANULARITY[range]
    const options = GRANULARITY_OPTIONS[range]
    if (!options) return DEFAULT_GRANULARITY[range]
    return (options as string[]).includes(urlGranularity)
      ? urlGranularity
      : DEFAULT_GRANULARITY[range]
  })()

  const { from: topFrom, to: topTo } = rangeToWindow(range)
  const activeFrame = drillStack.at(-1)
  const activeFrom = activeFrame?.from ?? topFrom
  const activeTo = activeFrame?.to ?? topTo
  const activeGranularity = activeFrame?.granularity ?? topGranularity

  const { data, isPending } = useQuery(
    adminAnalyticsQueryOptions(typedMetric, activeFrom, activeTo, activeGranularity),
  )

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const periodTotal = items.reduce((s, r) => s + r.count, 0)
  const bucketCount = items.length || 1
  const periodAverage = Math.round(periodTotal / bucketCount)
  const last7Total =
    activeGranularity === 'hour'
      ? Math.max(...items.map((i) => i.count), 0)
      : items.slice(-7).reduce((s, r) => s + r.count, 0)
  const topPeriods = [...items].sort((a, b) => b.count - a.count).slice(0, 5)
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

  const avgLabel =
    activeGranularity === 'hour'
      ? t('admin.analytics.hourlyAverage')
      : activeGranularity === 'week'
        ? t('admin.analytics.weeklyAverage')
        : activeGranularity === 'month'
          ? t('admin.analytics.monthlyAverage')
          : activeGranularity === 'year'
            ? t('admin.analytics.yearlyAverage')
            : t('admin.analytics.dailyAverage')

  const last7Label =
    activeGranularity === 'hour' ? t('admin.analytics.peakHour') : t('admin.analytics.last7Days')

  const perLabel =
    activeGranularity === 'hour'
      ? t('admin.analytics.perHour')
      : activeGranularity === 'week'
        ? t('admin.analytics.perWeek')
        : activeGranularity === 'month'
          ? t('admin.analytics.perMonth')
          : activeGranularity === 'year'
            ? t('admin.analytics.perYear')
            : t('admin.analytics.perDay')

  const chartConfig = {
    count: { label: t('admin.analytics.total'), color: config.color },
  } satisfies ChartConfig

  const maxTicks = Math.max(2, Math.floor(chartWidth / TICK_SLOT_PX[activeGranularity]))

  const chartData = items.map((item) => ({
    ...item,
    label: formatBucket(item.bucket, activeGranularity, i18n.language),
  }))

  function drillLabel(bucket: Date, granularity: AnalyticsGranularity): string {
    if (granularity === 'week') {
      const end = new Date(bucket.getTime() + 6 * 86400000)
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

  function popAll() {
    setDrillStack([])
  }

  function popToIndex(idx: number) {
    setDrillStack((prev) => prev.slice(0, idx + 1))
  }

  const isDrilling = drillStack.length > 0

  const visibleGranularityOptions = isDrilling
    ? activeFrame
      ? granularityOptionsForWindow(activeFrame.from, activeFrame.to)
      : null
    : GRANULARITY_OPTIONS[range]

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
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
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('admin.analytics.periodTotal')}
                </p>
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
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{avgLabel}</p>
            {isPending ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{periodAverage.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{last7Label}</p>
            {isPending ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{last7Total.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {isDrilling && (
                <Breadcrumb className="mb-2">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink render={<button type="button" />} onClick={popAll}>
                        {t(`admin.analytics.ranges.${range}`)}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {drillStack.map((frame, idx) => (
                      <Fragment key={`${frame.from}-${idx}`}>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          {idx < drillStack.length - 1 ? (
                            <BreadcrumbLink
                              render={<button type="button" />}
                              onClick={() => popToIndex(idx)}
                            >
                              {frame.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{frame.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
              <CardTitle>{t('admin.analytics.activityOverTime')}</CardTitle>
              <CardDescription>
                {t(`admin.analytics.${typedMetric}.label`)} {perLabel}
              </CardDescription>
            </div>

            {(visibleGranularityOptions || !isDrilling) && (
              <div className="flex items-center gap-2 shrink-0">
                {visibleGranularityOptions && (
                  <div className="flex items-center border rounded-md overflow-hidden text-xs">
                    {visibleGranularityOptions.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleGranularityChange(g)}
                        className={cn(
                          'px-3 py-1.5 font-medium transition-colors',
                          activeGranularity === g
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {t(`admin.analytics.granularity.${g}`)}
                      </button>
                    ))}
                  </div>
                )}

                {!isDrilling && (
                  <Select
                    value={range}
                    onValueChange={(v) =>
                      navigate({
                        to: '/admin/analytics/$metric',
                        params: { metric },
                        search: { range: v as Exclude<AnalyticsRange, '1d'> },
                        replace: true,
                      })
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>{t(`admin.analytics.ranges.${range}`)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {UI_RANGES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {t(`admin.analytics.ranges.${r}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div ref={chartContainerRef} className="w-full">
          {isPending ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    ticks={getEvenTicks(chartData, activeGranularity, maxTicks)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                    onClick={handleBarClick}
                    className={activeGranularity !== 'hour' ? 'cursor-pointer' : undefined}
                  />
                </BarChart>
              </ChartContainer>
              {activeGranularity !== 'hour' && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {t('admin.analytics.clickToZoom')}
                </p>
              )}
            </>
          )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div key={item.bucket} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-8 rounded-full ${config.rankBg} flex items-center justify-center`}
                      >
                        <span className={`text-xs font-semibold ${config.rankText}`}>
                          #{idx + 1}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatBucket(item.bucket, activeGranularity, i18n.language)}
                      </span>
                    </div>
                    <span className="text-sm font-bold">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
                        {formatBucket(peakItem.bucket, activeGranularity, i18n.language)}
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
      </div>
    </main>
  )
}
