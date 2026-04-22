import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { Permissions, hasPermissions } from '@marketplace/shared'

export const Route = createFileRoute('/_app/admin')({
  component: AdminLayout,
  beforeLoad: async ({ context }) => {
    const user = context.user
    const permissions = user?.role?.permissions ?? []
    const hasAdminAccess = hasPermissions(permissions, [
      Permissions.AdminUsersBan,
      Permissions.AdminUsersView,
      Permissions.AdminUsersAssignRole,
      Permissions.AdminRolesManage,
      Permissions.AdminCategoriesManage,
    ])
    if (!hasAdminAccess) throw redirect({ to: '/' })
  },
})

function AdminLayout() {
  return <Outlet />
}
