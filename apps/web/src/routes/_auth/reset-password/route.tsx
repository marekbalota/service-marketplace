import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"
import { currentUserQueryOptions } from "#/lib/queries/users"
import { ResetPasswordForm } from "./-components/ResetPasswordForm"

export const Route = createFileRoute("/_auth/reset-password")({
  validateSearch: z.object({
    token: z.string().min(1).optional(),
    error: z.string().optional(),
  }),
  component: ResetPasswordPage,
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: "/" })
    }
  },
})

function ResetPasswordPage() {
  const { token, error } = Route.useSearch()
  return <ResetPasswordForm token={token} urlError={error} />
}
