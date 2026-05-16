import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/_auth/change-email-pending')({
  validateSearch: z.object({ email: z.string().optional() }),
  component: ChangeEmailPendingPage,
})

function ChangeEmailPendingPage() {
  const { email } = Route.useSearch()

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Check your new inbox</CardTitle>
        <CardDescription>
          {email
            ? `We sent a verification link to ${email}`
            : 'We sent a verification link to your new email address'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          Click the link in that email to verify your new address. Until then your current email
          remains active.
        </p>
        <Link
          to="/account-settings"
          className={buttonVariants({ variant: 'outline', className: 'w-full' })}
        >
          Back to account settings
        </Link>
      </CardContent>
    </Card>
  )
}
