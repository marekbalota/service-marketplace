import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Permissions, hasAnyPermission, hasPermissions } from '@marketplace/shared'
import { cn } from '#/lib/utils'
import { PageHeader } from '#/components/PageHeader'
import { useCurrentUser } from '#/lib/queries/users'
import { adminStatsQueryOptions, adminRecentUsersQueryOptions } from '#/lib/queries/admin'
import { AdminOptions } from './-components/AdminOptions'
import { StatOverviewCard } from './-components/StatOverviewCard'
import { NewUsersCard } from './-components/NewUsersCard'

export const Route = createFileRoute('/_app/admin/')({
  loader: ({ context: { queryClient, user } }) => {
    const permissions = user?.role?.permissions ?? []
    const canViewStats = hasAnyPermission(permissions, [
      Permissions.AdminStatsView,
      Permissions.AdminAnalyticsView,
    ])
    const canViewUsers = hasPermissions(permissions, [Permissions.AdminUsersView])
    if (canViewStats) void queryClient.prefetchQuery(adminStatsQueryOptions)
    if (canViewUsers) void queryClient.prefetchQuery(adminRecentUsersQueryOptions)
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()
  const permissions = user?.role?.permissions ?? []
  const canViewStats = hasAnyPermission(permissions, [
    Permissions.AdminStatsView,
    Permissions.AdminAnalyticsView,
  ])
  const canViewAnalytics = hasPermissions(permissions, [Permissions.AdminAnalyticsView])
  const canViewUsers = hasPermissions(permissions, [Permissions.AdminUsersView])

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title={t('admin.title')} description={t('admin.subtitle')} />
      <AdminOptions />
      {(canViewStats || canViewUsers) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {canViewStats && (
            <StatOverviewCard
              canViewAnalytics={canViewAnalytics}
              className={cn(!canViewUsers && 'lg:col-span-2')}
            />
          )}
          {canViewUsers && <NewUsersCard className={cn(!canViewStats && 'lg:col-span-2')} />}
        </div>
      )}
    </main>
  )
}
