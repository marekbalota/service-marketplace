import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { Permissions, hasAnyPermission } from '@marketplace/shared'

export const Route = createFileRoute('/$locale/_app/admin/users/$userId')({
  beforeLoad: ({ context: { user }, params }) => {
    const permissions = user?.role?.permissions ?? []
    if (
      !hasAnyPermission(permissions, [
        Permissions.AdminUsersView,
        Permissions.AdminUsersImpersonate,
        Permissions.AdminPostsDeleteAny,
      ])
    ) {
      throw redirect({ to: '/$locale/posts', params })
    }
  },
  component: () => <Outlet />,
})
