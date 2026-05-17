import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Smartphone, Mail, Shield, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'

export const Route = createFileRoute('/_auth/verify-2fa/')({
  validateSearch: z.object({
    redirect: z.string().optional(),
    email: z.string().optional(),
  }),
  component: VerifyTwoFaSelectionPage,
})

const CHALLENGE_METHODS = [
  {
    id: 'totp',
    label: 'Authenticator App',
    description: 'Enter a code from your authenticator app',
    icon: Smartphone,
    to: '/verify-2fa/totp' as const,
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Receive a verification code via email',
    icon: Mail,
    to: '/verify-2fa/email' as const,
  },
  {
    id: 'backup',
    label: 'Use a backup code instead',
    description: 'Use one of your saved backup codes',
    icon: Shield,
    to: '/verify-2fa/backup' as const,
  },
] as const

function VerifyTwoFaSelectionPage() {
  const { redirect, email } = Route.useSearch()

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">2-Step Verification</CardTitle>
        {email && <p className="text-sm font-medium">{email}</p>}
        <CardDescription>Choose how you want to verify your identity.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {CHALLENGE_METHODS.map((method, i) => (
          <div key={method.id}>
            {i > 0 && <Separator />}
            <Link
              to={method.to}
              search={{ redirect, email }}
              className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <method.icon className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{method.label}</p>
                <p className="text-xs text-muted-foreground">{method.description}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </Link>
          </div>
        ))}
        <Separator />
        <div className="px-6 py-4 text-center">
          <Link
            to="/login"
            search={redirect ? { redirect } : {}}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
