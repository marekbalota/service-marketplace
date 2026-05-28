import { useEffect, useRef, useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
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
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { getEvenTicks, TICK_SLOT_PX, UI_RANGES } from '../-utils'
import type { AnalyticsMetric, AnalyticsRange, AnalyticsGranularity } from '#/lib/queries/admin'
import type { DrillFrame, GranularityOption } from '../-utils'

type AnalyticsChartCardProps = {
  range: AnalyticsRange
  typedMetric: AnalyticsMetric
  isDrilling: boolean
  drillStack: DrillFrame[]
  activeGranularity: AnalyticsGranularity
  visibleGranularityOptions: GranularityOption[] | null | undefined
  chartData: Array<{ label: string; bucket: Date; count: number }>
  isPending: boolean
  color: string
  onBarClick: (barData: unknown) => void
  onGranularityChange: (g: GranularityOption) => void
  onPopAll: () => void
  onPopToIndex: (idx: number) => void
  onRangeChange: (range: Exclude<AnalyticsRange, '1d'>) => void
}

export function AnalyticsChartCard({
  range,
  typedMetric,
  isDrilling,
  drillStack,
  activeGranularity,
  visibleGranularityOptions,
  chartData,
  isPending,
  color,
  onBarClick,
  onGranularityChange,
  onPopAll,
  onPopToIndex,
  onRangeChange,
}: AnalyticsChartCardProps) {
  const { t } = useTranslation()

  const perLabel = (() => {
    switch (activeGranularity) {
      case 'hour': return t('admin.analytics.perHour')
      case 'week': return t('admin.analytics.perWeek')
      case 'month': return t('admin.analytics.perMonth')
      case 'year': return t('admin.analytics.perYear')
      default: return t('admin.analytics.perDay')
    }
  })()
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState(700)

  useEffect(() => {
    const el = chartContainerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setChartWidth(entry!.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const maxTicks = Math.max(2, Math.floor(chartWidth / TICK_SLOT_PX[activeGranularity]))
  const chartConfig = {
    count: { label: t('admin.analytics.total'), color },
  } satisfies ChartConfig

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {isDrilling && (
              <Breadcrumb className="mb-2">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<button type="button" />} onClick={onPopAll}>
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
                            onClick={() => onPopToIndex(idx)}
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
                <ToggleGroup
                  value={[activeGranularity]}
                  onValueChange={(v) => { if (v.length > 0) onGranularityChange(v[0] as GranularityOption) }}
                  className="overflow-hidden rounded-md border"
                >
                  {visibleGranularityOptions.map((g) => (
                    <ToggleGroupItem
                      key={g}
                      value={g}
                      className={[
                        'h-auto rounded-none px-3 py-1.5 text-xs font-medium',
                        activeGranularity === g
                          ? 'aria-pressed:bg-primary aria-pressed:text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted',
                      ].join(' ')}
                    >
                      {t(`admin.analytics.granularity.${g}`)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}

              {!isDrilling && (
                <Select
                  value={range}
                  onValueChange={(v) => onRangeChange(v as Exclude<AnalyticsRange, '1d'>)}
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
                    onClick={onBarClick}
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
  )
}
