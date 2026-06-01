import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/$locale/_app/account-settings')({
  beforeLoad: ({ context: { user }, location, params }) => {
    if (!user)
      throw redirect({
        to: '/$locale/login',
        params,
        search: { redirect: location.href },
        replace: true,
      })
  },
  component: () => <Outlet />,
})
