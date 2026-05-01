import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card"
import { LoginForm } from "./-components/LoginForm"
import { currentUserQueryOptions } from "#/lib/queries/users"

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: (search.redirect?.startsWith('/') ? search.redirect : '/') as '/' })
    }
  },
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirect={redirect} />
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="font-medium">
                Create one
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
