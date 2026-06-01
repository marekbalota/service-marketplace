import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { useLocale } from '#/lib/useLocale'

export const Route = createFileRoute('/$locale/_auth/change-email-pending')({
  validateSearch: z.object({ email: z.string().optional() }),
  component: ChangeEmailPendingPage,
})

function ChangeEmailPendingPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { email } = Route.useSearch()

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('auth.changeEmailPending.title')}</CardTitle>
        <CardDescription>
          {email
            ? t('auth.changeEmailPending.sentTo', { email })
            : t('auth.changeEmailPending.sentGeneric')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.changeEmailPending.instruction')}
        </p>
        <Link
          to="/$locale/account-settings"
          params={{ locale }}
          className={buttonVariants({ variant: 'outline', className: 'w-full' })}
        >
          {t('auth.changeEmailPending.backButton')}
        </Link>
      </CardContent>
    </Card>
  )
}
