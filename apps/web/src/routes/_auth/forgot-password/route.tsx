import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { ForgotPasswordForm } from './-components/ForgotPasswordForm'

export const Route = createFileRoute('/_auth/forgot-password')({
  validateSearch: z.object({ email: z.string().optional() }),
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { email } = Route.useSearch()
  return <ForgotPasswordForm defaultEmail={email} />
}
