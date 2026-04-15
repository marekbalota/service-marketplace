import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/admin')({
  component: AdminLayout,
  beforeLoad: ({ context: { user } }) => {
    const permissions = user?.role?.permissions ?? []
    const hasAdminAccess = permissions.some((p: string) => p.startsWith('admin:'))
    if (!hasAdminAccess) throw redirect({ to: '/' })
  },
})

function AdminLayout() {
  return <Outlet />
}
