import { createFileRoute, Link } from '@tanstack/react-router'
import { Users, Shield, Flag, ChevronRight, FolderTree } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { PageHeader } from '#/components/PageHeader'
import { Permissions, hasAnyPermission, hasPermissions } from '@marketplace/shared'
import { useCurrentUser } from '#/lib/queries/users'
import { adminStatsQueryOptions, adminRecentUsersQueryOptions } from '#/lib/queries/admin'

export const Route = createFileRoute('/_app/admin/')({
  component: AdminDashboard,
})

export function useAdminStats() {
  return useQuery(adminStatsQueryOptions)
}

export function useAdminRecentUsers() {
  return useQuery(adminRecentUsersQueryOptions)
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-indigo-500',
]

function getAvatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]!
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

function formatRelativeTime(date: string | Date, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diffMs = new Date(date).getTime() - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHr = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHr / 24)
  if (Math.abs(diffDay) >= 1) return rtf.format(diffDay, 'day')
  if (Math.abs(diffHr) >= 1) return rtf.format(diffHr, 'hour')
  if (Math.abs(diffMin) >= 1) return rtf.format(diffMin, 'minute')
  return rtf.format(diffSec, 'second')
}

function AdminDashboard() {
  const { t } = useTranslation()
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title={t('admin.title')} description={t('admin.subtitle')} />
      <AdminOptions />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <StatOverviewCard />
        <NewUsersCard />
      </div>
    </main>
  )
}

function StatOverviewCard() {
  const { t } = useTranslation()
  const { data: stats, isPending } = useAdminStats()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.overview.title')}</CardTitle>
        <CardDescription>{t('admin.overview.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/admin/analytics/$metric"
            params={{ metric: 'users' }}
            search={{ range: '30d' }}
            className="block"
          >
            <div className="p-4 bg-blue-100 dark:bg-blue-500/20 rounded-lg border border-blue-200 dark:border-blue-400/30 hover:bg-blue-200 dark:hover:bg-blue-500/25 transition-colors cursor-pointer">
              {isPending ? (
                <Skeleton className="h-9 w-16 mb-1" />
              ) : (
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">
                  {stats?.totalUsers.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">{t('admin.overview.totalUsers')}</p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-2 font-medium">
                {t('admin.overview.viewAnalytics')}
              </p>
            </div>
          </Link>

          <Link
            to="/admin/analytics/$metric"
            params={{ metric: 'posts' }}
            search={{ range: '30d' }}
            className="block"
          >
            <div className="p-4 bg-green-100 dark:bg-green-500/20 rounded-lg border border-green-200 dark:border-green-400/30 hover:bg-green-200 dark:hover:bg-green-500/25 transition-colors cursor-pointer">
              {isPending ? (
                <Skeleton className="h-9 w-16 mb-1" />
              ) : (
                <p className="text-3xl font-bold text-green-600 dark:text-green-300">
                  {stats?.activePosts.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {t('admin.overview.activePosts')}
              </p>
              <p className="text-xs text-green-600 dark:text-green-300 mt-2 font-medium">
                {t('admin.overview.viewAnalytics')}
              </p>
            </div>
          </Link>

          <Link
            to="/admin/analytics/$metric"
            params={{ metric: 'messages' }}
            search={{ range: '30d' }}
            className="block"
          >
            <div className="p-4 bg-orange-100 dark:bg-orange-500/20 rounded-lg border border-orange-200 dark:border-orange-400/30 hover:bg-orange-200 dark:hover:bg-orange-500/25 transition-colors cursor-pointer">
              {isPending ? (
                <Skeleton className="h-9 w-16 mb-1" />
              ) : (
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-300">
                  {stats?.totalMessages.toLocaleString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {t('admin.overview.totalMessages')}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-300 mt-2 font-medium">
                {t('admin.overview.viewAnalytics')}
              </p>
            </div>
          </Link>

          <div className="p-4 bg-red-100 dark:bg-red-500/20 rounded-lg border border-red-200 dark:border-red-400/30">
            {isPending ? (
              <Skeleton className="h-9 w-16 mb-1" />
            ) : (
              <p className="text-3xl font-bold text-red-600 dark:text-red-300">
                {stats?.activeBans.toLocaleString()}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">{t('admin.overview.activeBans')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function NewUsersCard() {
  const { t, i18n } = useTranslation()
  const { data, isPending } = useAdminRecentUsers()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.newUsers.title')}</CardTitle>
        <CardDescription>{t('admin.newUsers.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {data?.items.map((user, idx) => (
              <div
                key={user.userId}
                className={`flex items-center gap-3 py-3 ${idx < (data.items.length - 1) ? 'border-b' : ''}`}
              >
                <div
                  className={`size-9 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}
                >
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(user.createdAt, i18n.language)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AdminOptions() {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()
  const permissions = user?.role?.permissions ?? []

  const adminOptions = [
    {
      id: 'users',
      title: t('admin.manageAccounts'),
      description: t('admin.manageAccountsDesc'),
      icon: Users,
      path: '/admin/users',
    },
    {
      id: 'roles',
      title: t('admin.manageRoles'),
      description: t('admin.manageRolesDesc'),
      icon: Shield,
      path: '/admin/roles',
    },
    {
      id: 'reports',
      title: t('admin.manageReports'),
      description: t('admin.manageReportsDesc'),
      icon: Flag,
      path: '/admin/reports',
    },
    {
      id: 'categories',
      title: t('admin.manageCategories'),
      description: t('admin.manageCategoriesDesc'),
      icon: FolderTree,
      path: '/admin/categories',
    },
  ]

  const canManageUsers = hasAnyPermission(permissions, [
    Permissions.AdminUsersView,
    Permissions.AdminUsersBan,
    Permissions.AdminUsersAssignRole,
    Permissions.AdminUsersImpersonate,
    Permissions.AdminPostsDeleteAny,
  ])
  const canManageRoles = hasPermissions(permissions, [Permissions.AdminRolesManage])
  const canManageCategories = hasPermissions(permissions, [Permissions.AdminCategoriesManage])

  const visibleOptions = adminOptions.filter((option) => {
    if (option.id === 'users') return canManageUsers
    if (option.id === 'roles') return canManageRoles
    if (option.id === 'reports') return canManageUsers
    if (option.id === 'categories') return canManageCategories
    return true
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {visibleOptions.map((option) => {
        const Icon = option.icon
        return (
          <Link key={option.id} to={option.path} className="block group hover:no-underline">
            <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-primary/10 rounded-lg mb-4">
                    <Icon className="size-6 text-primary" />
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
