import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/account-settings')({
  beforeLoad: ({ context: { user }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: () => <Outlet />,
})
