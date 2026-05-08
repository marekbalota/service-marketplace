import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/_auth/verify-email/')({
  validateSearch: z.object({ email: z.string().optional() }),
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: '/' })
    }
  },
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const navigate = useNavigate()
  const { email } = Route.useSearch()
  const [cooldown, setCooldown] = useState(0)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { data } = await authClient.getSession()
        if (data?.session) {
          clearInterval(id)
          await queryClient.invalidateQueries()
          navigate({ to: '/' })
        }
      } catch {
        // fail silently, retry next tick
      }
    }, 3000)
    return () => clearInterval(id)
  }, [navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(id)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const handleResend = async () => {
    if (!email || cooldown > 0) return
    setCooldown(60)
    setResendError(null)
    const { error } = await authClient.sendVerificationEmail({ email })
    if (error) {
      setCooldown(0)
      setResendError(error.message ?? 'Failed to resend. Please try again.')
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          {email
            ? `We sent a verification link to ${email}`
            : 'We sent a verification link to your email address'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          Click the link in the email to verify your account. This page will sign you in
          automatically once verified.
        </p>
        {email && (
          <Button
            onClick={handleResend}
            disabled={cooldown > 0}
            variant="outline"
            className="w-full"
          >
            {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend verification email'}
          </Button>
        )}
        {resendError && (
          <p className="text-center text-sm text-destructive">{resendError}</p>
        )}
        <div className="text-center">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Wrong email? Sign in with a different account
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
