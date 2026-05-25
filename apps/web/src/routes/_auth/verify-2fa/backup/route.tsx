import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export const Route = createFileRoute('/_auth/verify-2fa/backup')({
  validateSearch: z.object({
    redirect: z.string().optional(),
    email: z.string().optional(),
    twoFactorMethods: z.array(z.enum(['email', 'totp'])).optional(),
  }),
  component: BackupChallengePage,
})

function BackupChallengePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { redirect, email, twoFactorMethods } = Route.useSearch()
  const [code, setCode] = useState('')

  const verify = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
      if (error) throw new Error(error.message ?? t('twoFactor.verifyBackup.errorInvalidCode'))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      void navigate({ to: (redirect?.startsWith('/') ? redirect : '/') as '/', replace: true })
    },
  })

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('twoFactor.verifyBackup.title')}</CardTitle>
        <CardDescription>{t('twoFactor.verifyBackup.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="backup-code-input">{t('twoFactor.verifyBackup.codeLabel')}</Label>
          <Input
            id="backup-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code && !verify.isPending) verify.mutate()
            }}
            className="font-mono"
            placeholder="xxxxxxxx"
            autoComplete="off"
          />
        </div>
        {verify.error && <p className="text-sm text-destructive">{verify.error.message}</p>}
        <Button
          className="w-full"
          onClick={() => verify.mutate()}
          disabled={!code || verify.isPending}
        >
          {verify.isPending ? t('twoFactor.common.verifying') : t('twoFactor.common.verify')}
        </Button>
        <div className="text-center">
          <Link
            to="/verify-2fa"
            search={{ redirect, email, twoFactorMethods }}
            replace
            className="font-medium hover:text-foreground text-muted-foreground"
          >
            {t('twoFactor.common.tryAnotherWay')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
