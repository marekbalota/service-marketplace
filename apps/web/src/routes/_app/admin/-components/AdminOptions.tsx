import { Link } from '@tanstack/react-router'
import { Users, Shield, Flag, ChevronRight, FolderTree } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Permissions, hasAnyPermission, hasPermissions } from '@marketplace/shared'
import { useCurrentUser } from '#/lib/queries/users'
import { cn } from '#/lib/utils'

const RESPONSIVE_COLS = [
  '',
  'lg:grid-cols-1',
  'md:grid-cols-2',
  'md:grid-cols-3',
  'md:grid-cols-2 lg:grid-cols-4',
] as const

export function AdminOptions() {
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
  const canManageReports = hasPermissions(permissions, [Permissions.AdminReportsManage])
  const canManageCategories = hasPermissions(permissions, [Permissions.AdminCategoriesManage])

  const visibleOptions = adminOptions.filter((option) => {
    if (option.id === 'users') return canManageUsers
    if (option.id === 'roles') return canManageRoles
    if (option.id === 'reports') return canManageReports
    if (option.id === 'categories') return canManageCategories
    return true
  })

  if (visibleOptions.length === 0) return null

  return (
    <div className={cn('grid grid-cols-1 gap-6', RESPONSIVE_COLS[visibleOptions.length])}>
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
