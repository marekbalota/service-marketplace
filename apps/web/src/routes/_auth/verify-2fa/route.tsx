import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { queryClient } from '#/router'
import { currentUserQueryOptions } from '#/lib/queries/users'

export const Route = createFileRoute('/_auth/verify-2fa')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async () => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: () => <Outlet />,
})
