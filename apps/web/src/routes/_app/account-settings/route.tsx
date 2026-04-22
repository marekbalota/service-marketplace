import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { authClient } from '#/auth'

export const Route = createFileRoute('/_app/account-settings')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) throw redirect({ to: '/login' })
  },
  component: () => <Outlet />,
})
