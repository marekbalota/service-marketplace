import { createFileRoute, redirect } from "@tanstack/react-router"
import { currentUserQueryOptions } from "#/lib/queries/users"
import { ForgotPasswordForm } from "./-components/ForgotPasswordForm"

export const Route = createFileRoute("/_auth/forgot-password")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: "/" })
    }
  },
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
