import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { Permissions, hasAnyPermission } from '@marketplace/shared'

export const Route = createFileRoute('/$locale/_app/admin')({
  component: AdminLayout,
  beforeLoad: async ({ context: { user }, location, params }) => {
    if (!user) throw redirect({ to: '/$locale/login', params, search: { redirect: location.href }, replace: true })
    const permissions = user?.role?.permissions ?? []
    const hasAdminAccess = hasAnyPermission(permissions, [
      Permissions.AdminUsersBan,
      Permissions.AdminUsersView,
      Permissions.AdminUsersAssignRole,
      Permissions.AdminUsersImpersonate,
      Permissions.AdminPostsDeleteAny,
      Permissions.AdminRolesManage,
      Permissions.AdminCategoriesManage,
      Permissions.AdminReportsManage,
      Permissions.AdminStatsView,
      Permissions.AdminAnalyticsView,
    ])
    if (!hasAdminAccess) throw redirect({ to: '/$locale/posts', params })
  },
})

function AdminLayout() {
  return <Outlet />
}
