import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { z } from 'zod'
import { CheckCircle2, XCircle } from 'lucide-react'
import { queryClient } from '#/router'
import { buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { useLocale } from '#/lib/useLocale'

export const Route = createFileRoute('/$locale/_auth/verify-email/callback')({
  validateSearch: z.object({ error: z.string().optional() }),
  component: VerifyEmailCallbackPage,
})

function VerifyEmailCallbackPage() {
  const locale = useLocale()
  const navigate = useNavigate()
  const { error } = Route.useSearch()

  useEffect(() => {
    if (error) return
    void queryClient.invalidateQueries()
    const id = setTimeout(() => navigate({ to: '/' }), 1500)
    return () => clearTimeout(id)
  }, [error, navigate])

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-heading text-2xl font-medium">Link expired or invalid</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Verification links expire after 1 hour. Request a new one by signing in.
          </p>
          <Link
            to="/$locale/login"
            params={{ locale }}
            className={buttonVariants({ className: 'w-full' })}
          >
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
        </div>
        <h2 className="font-heading text-2xl font-medium">Email verified!</h2>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">Signing you in…</p>
      </CardContent>
    </Card>
  )
}
