import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { RegisterForm } from './-components/RegisterForm'
import { currentUserQueryOptions } from '#/lib/queries/users'

export const Route = createFileRoute('/_auth/register')({
  component: RegisterPage,
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: '/' })
    }
  },
})

function RegisterPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Get started with Service Marketplace</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:text-foreground">
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
