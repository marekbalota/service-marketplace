import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TwoFactorMethod } from '@marketplace/shared'
import { Smartphone, Mail, Shield, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'

export const Route = createFileRoute('/_auth/verify-2fa/')({
  validateSearch: z.object({
    redirect: z.string().optional(),
    email: z.string().optional(),
    twoFactorMethods: z.array(z.enum(['email', 'totp'] as const)).optional(),
  }),
  component: VerifyTwoFaSelectionPage,
})

const CHALLENGE_METHODS = [
  {
    id: 'totp',
    icon: Smartphone,
    to: '/verify-2fa/totp' as const,
    labelKey: 'twoFactor.verifySelection.totp.label' as const,
    descriptionKey: 'twoFactor.verifySelection.totp.description' as const,
  },
  {
    id: 'email',
    icon: Mail,
    to: '/verify-2fa/email' as const,
    labelKey: 'twoFactor.verifySelection.email.label' as const,
    descriptionKey: 'twoFactor.verifySelection.email.description' as const,
  },
  {
    id: 'backup',
    icon: Shield,
    to: '/verify-2fa/backup' as const,
    labelKey: 'twoFactor.verifySelection.backup.label' as const,
    descriptionKey: 'twoFactor.verifySelection.backup.description' as const,
  },
] as const

function VerifyTwoFaSelectionPage() {
  const { t } = useTranslation()
  const { redirect, email, twoFactorMethods } = Route.useSearch()

  const visibleMethods = CHALLENGE_METHODS.filter(
    (m) =>
      m.id === 'backup' || !twoFactorMethods || twoFactorMethods.includes(m.id as TwoFactorMethod),
  )

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('twoFactor.verifySelection.title')}</CardTitle>
        {email && <p className="text-sm font-medium">{email}</p>}
        <CardDescription>{t('twoFactor.verifySelection.description')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {visibleMethods.map((method, i) => (
          <div key={method.id}>
            {i > 0 && <Separator />}
            <Link
              to={method.to}
              search={{ redirect, email, twoFactorMethods }}
              replace
              className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
            >
              <method.icon className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t(method.labelKey)}</p>
                <p className="text-xs text-muted-foreground">{t(method.descriptionKey)}</p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </Link>
          </div>
        ))}
        <Separator />
        <div className="px-6 py-4 flex justify-center">
          <Link
            to="/login"
            search={redirect ? { redirect } : {}}
            replace
            className="font-medium hover:text-foreground text-muted-foreground"
          >
            {t('twoFactor.verifySelection.backToLogin')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
