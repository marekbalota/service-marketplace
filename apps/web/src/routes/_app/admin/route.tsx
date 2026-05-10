import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { Permissions, hasAnyPermission } from '@marketplace/shared'

export const Route = createFileRoute('/_app/admin')({
  component: AdminLayout,
  beforeLoad: async ({ context: { user }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
    const permissions = user?.role?.permissions ?? []
    const hasAdminAccess = hasAnyPermission(permissions, [
      Permissions.AdminUsersBan,
      Permissions.AdminUsersView,
      Permissions.AdminUsersAssignRole,
      Permissions.AdminUsersImpersonate,
      Permissions.AdminPostsDeleteAny,
      Permissions.AdminRolesManage,
      Permissions.AdminCategoriesManage,
    ])
    if (!hasAdminAccess) throw redirect({ to: '/' })
  },
})

function AdminLayout() {
  return <Outlet />
}
