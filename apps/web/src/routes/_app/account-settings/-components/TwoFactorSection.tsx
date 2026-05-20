import { useState } from 'react'
import { Mail, Smartphone, Shield } from 'lucide-react'
import { useSuspenseQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import type { TwoFactorMethod } from '@marketplace/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { twoFactorStatusQueryOptions } from '#/lib/queries/two-factor'
import { useCurrentUser } from '#/lib/queries/users'
import { EnableTotpDialog } from './EnableTotpDialog'
import { EnableEmailDialog } from './EnableEmailDialog'
import { BackupCodesDialog } from './BackupCodesDialog'
import { DisableMethodDialog } from './DisableMethodDialog'

type DialogId = 'enable-totp' | 'enable-email' | 'backup-codes' | `disable-${TwoFactorMethod}`

const METHODS = [
  {
    id: 'totp' as const,
    icon: Smartphone,
    labelKey: 'twoFactor.section.totp.label' as const,
    descriptionKey: 'twoFactor.section.totp.description' as const,
  },
  {
    id: 'email' as const,
    icon: Mail,
    labelKey: 'twoFactor.section.email.label' as const,
    descriptionKey: 'twoFactor.section.email.description' as const,
  },
] as const

export function TwoFactorSection() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(twoFactorStatusQueryOptions)
  const [openDialog, setOpenDialog] = useState<DialogId | null>(null)
  const [disableMethod, setDisableMethod] = useState<TwoFactorMethod>('email')
  const { data: user } = useCurrentUser()
  const isImpersonating = !user || !!user.impersonatedBy

  function buildDisableWarning(method: TwoFactorMethod, isLastMethod: boolean): string {
    const base =
      method === 'email'
        ? t('twoFactor.section.disableWarning.email')
        : t('twoFactor.section.disableWarning.totp')
    return isLastMethod ? `${base} ${t('twoFactor.section.disableWarning.lastMethod')}` : base
  }

  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      const fn =
        disableMethod === 'email'
          ? authClient.twoFactor.disableEmail
          : authClient.twoFactor.disableTotp
      const { error } = await fn({ password })
      if (error) throw new Error(error.message ?? t('twoFactor.enableTotp.errorOccurred'))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
      toast.success(
        disableMethod === 'email'
          ? t('twoFactor.section.toast.emailDisabled')
          : t('twoFactor.section.toast.totpDisabled'),
      )
      setOpenDialog(null)
    },
  })

  function openDisableDialog(method: TwoFactorMethod) {
    setDisableMethod(method)
    setOpenDialog(`disable-${method}`)
  }

  if (!data) return null

  const enabledMethodSet = new Set(data.enabledMethods ?? [])
  const enabledMethods = METHODS.filter((m) => enabledMethodSet.has(m.id))
  const availableMethods = METHODS.filter((m) => !enabledMethodSet.has(m.id))

  return (
    <>
      <Card id="two-factor-auth">
        <CardHeader>
          <CardTitle>{t('accountSettings.twoFactor')}</CardTitle>
          <CardDescription>{t('accountSettings.twoFactorSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabledMethods.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t('twoFactor.section.enabled')}
              </p>
              <div className="space-y-3">
                {enabledMethods.map(({ id, icon: Icon, labelKey, descriptionKey }) => (
                  <div key={id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <Icon className="size-5 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t(labelKey)}</p>
                        <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
                      </div>
                    </div>
                    {isImpersonating ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span tabIndex={0} className="inline-flex">
                              <Button variant="destructive" disabled>
                                {t('twoFactor.section.disable')}
                              </Button>
                            </span>
                          }
                        />
                        <TooltipContent>
                          {t('accountSettings.impersonationRestricted')}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button variant="destructive" onClick={() => openDisableDialog(id)}>
                        {t('twoFactor.section.disable')}
                      </Button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Shield className="size-5 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t('twoFactor.section.backupCodes.label')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('twoFactor.section.backupCodes.description')}
                      </p>
                    </div>
                  </div>
                  {isImpersonating ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span tabIndex={0} className="inline-flex">
                            <Button variant="outline" disabled>
                              {t('twoFactor.section.manage')}
                            </Button>
                          </span>
                        }
                      />
                      <TooltipContent>
                        {t('accountSettings.impersonationRestricted')}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button variant="outline" onClick={() => setOpenDialog('backup-codes')}>
                      {t('twoFactor.section.manage')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {enabledMethods.length > 0 && availableMethods.length > 0 && <Separator />}

          {availableMethods.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t('twoFactor.section.available')}
              </p>
              <div className="space-y-3">
                {availableMethods.map(({ id, icon: Icon, labelKey, descriptionKey }) => (
                  <div key={id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t(labelKey)}</p>
                        <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
                      </div>
                    </div>
                    {isImpersonating ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span tabIndex={0} className="inline-flex">
                              <Button disabled>{t('twoFactor.section.enable')}</Button>
                            </span>
                          }
                        />
                        <TooltipContent>
                          {t('accountSettings.impersonationRestricted')}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button onClick={() => setOpenDialog(`enable-${id}`)}>
                        {t('twoFactor.section.enable')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EnableTotpDialog
        open={openDialog === 'enable-totp'}
        onOpenChange={(o) => !o && setOpenDialog(null)}
      />
      <EnableEmailDialog
        open={openDialog === 'enable-email'}
        onOpenChange={(o) => !o && setOpenDialog(null)}
      />
      <BackupCodesDialog
        open={openDialog === 'backup-codes'}
        onOpenChange={(o) => !o && setOpenDialog(null)}
      />
      <DisableMethodDialog
        open={openDialog === 'disable-totp' || openDialog === 'disable-email'}
        onOpenChange={(o) => {
          if (!o) {
            setOpenDialog(null)
            disableMutation.reset()
          }
        }}
        warning={buildDisableWarning(disableMethod, enabledMethods.length === 1)}
        isPending={disableMutation.isPending}
        error={disableMutation.error as Error | null}
        onSubmit={disableMutation.mutate}
      />
    </>
  )
}
