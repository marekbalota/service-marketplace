import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { adminStatsQueryOptions } from '#/lib/queries/admin'

const STAT_CONFIGS = [
  {
    metric: 'users' as const,
    labelKey: 'admin.overview.totalUsers',
    colorClasses: {
      bg: 'bg-blue-100 dark:bg-blue-500/20',
      border: 'border-blue-200 dark:border-blue-400/30',
      hover: 'hover:bg-blue-200 dark:hover:bg-blue-500/25',
      text: 'text-blue-600 dark:text-blue-300',
    },
    getValue: (stats: { totalUsers: number }) => stats.totalUsers,
  },
  {
    metric: 'posts' as const,
    labelKey: 'admin.overview.activePosts',
    colorClasses: {
      bg: 'bg-green-100 dark:bg-green-500/20',
      border: 'border-green-200 dark:border-green-400/30',
      hover: 'hover:bg-green-200 dark:hover:bg-green-500/25',
      text: 'text-green-600 dark:text-green-300',
    },
    getValue: (stats: { activePosts: number }) => stats.activePosts,
  },
  {
    metric: 'messages' as const,
    labelKey: 'admin.overview.totalMessages',
    colorClasses: {
      bg: 'bg-orange-100 dark:bg-orange-500/20',
      border: 'border-orange-200 dark:border-orange-400/30',
      hover: 'hover:bg-orange-200 dark:hover:bg-orange-500/25',
      text: 'text-orange-600 dark:text-orange-300',
    },
    getValue: (stats: { totalMessages: number }) => stats.totalMessages,
  },
] as const

interface StatOverviewCardProps {
  canViewAnalytics: boolean
  className?: string
}

export function StatOverviewCard({ canViewAnalytics, className }: StatOverviewCardProps) {
  const { t } = useTranslation()
  const { data: stats, isPending } = useQuery(adminStatsQueryOptions)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('admin.overview.title')}</CardTitle>
        <CardDescription>{t('admin.overview.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {STAT_CONFIGS.map(({ metric, labelKey, colorClasses, getValue }) =>
            isPending ? (
              <div
                key={metric}
                className={`p-4 rounded-lg border ${colorClasses.bg} ${colorClasses.border}`}
              >
                <Skeleton className="h-9 w-16 mb-2" />
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-3 w-20" />
              </div>
            ) : (
              <Link
                key={metric}
                to="/admin/analytics"
                search={{ metric, range: '30d' }}
                disabled={!canViewAnalytics}
                className={`block ${canViewAnalytics ? '' : 'pointer-events-none'}`}
              >
                <div
                  className={`p-4 rounded-lg border ${colorClasses.bg} ${colorClasses.border} ${canViewAnalytics ? `${colorClasses.hover} transition-colors cursor-pointer` : ''}`}
                >
                  <p className={`text-3xl font-bold ${colorClasses.text}`}>
                    {getValue(stats!).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{t(labelKey)}</p>
                  <p
                    className={`text-xs ${colorClasses.text} mt-2 font-medium flex items-center gap-1 ${canViewAnalytics ? '' : 'invisible'}`}
                  >
                    {t('admin.overview.viewAnalytics')}
                    <ArrowRight className="size-3" />
                  </p>
                </div>
              </Link>
            ),
          )}

          <div className="p-4 bg-red-100 dark:bg-red-500/20 rounded-lg border border-red-200 dark:border-red-400/30">
            {isPending ? (
              <>
                <Skeleton className="h-9 w-16 mb-2" />
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-red-600 dark:text-red-300">
                  {stats?.activeBans.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('admin.overview.activeBans')}
                </p>
                <p className="text-xs mt-2 font-medium flex items-center gap-1 invisible">&nbsp;</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
