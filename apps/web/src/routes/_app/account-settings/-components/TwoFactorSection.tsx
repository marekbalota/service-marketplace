import { useState, useRef } from 'react'
import { Mail, Smartphone, Shield } from 'lucide-react'
import { useSuspenseQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { TwoFactorMethod } from '@marketplace/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { twoFactorStatusQueryOptions } from '#/lib/queries/two-factor'
import { EnableTotpDialog } from './EnableTotpDialog'
import { EnableEmailDialog } from './EnableEmailDialog'
import { BackupCodesDialog } from './BackupCodesDialog'
import { DisableMethodDialog } from './DisableMethodDialog'

type DialogId = 'enable-totp' | 'enable-email' | 'backup-codes' | `disable-${TwoFactorMethod}`

const METHODS = [
  { id: 'totp' as const, label: 'Authenticator App', description: 'Use an app like Google Authenticator or Authy', icon: Smartphone },
  { id: 'email' as const, label: 'Email', description: 'Receive a verification code via email', icon: Mail },
] as const

function buildDisableWarning(method: TwoFactorMethod, isLastMethod: boolean): string {
  const base = method === 'email'
    ? 'This will disable email verification for your account.'
    : 'This will disable your authenticator app for your account.'
  return isLastMethod ? `${base} This will turn off two-factor authentication for your account entirely.` : base
}

export function TwoFactorSection() {
  const { data } = useSuspenseQuery(twoFactorStatusQueryOptions)
  const [openDialog, setOpenDialog] = useState<DialogId | null>(null)
  const disableMethodRef = useRef<TwoFactorMethod>('email')

  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      const method = disableMethodRef.current
      const fn = method === 'email' ? authClient.twoFactor.disableEmail : authClient.twoFactor.disableTotp
      const { error } = await fn({ password })
      if (error) throw new Error(error.message ?? 'An error occurred')
    },
    onSuccess: () => {
      const method = disableMethodRef.current
      void queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
      toast.success(method === 'email' ? 'Email 2FA disabled' : 'Authenticator app disabled')
      setOpenDialog(null)
    },
  })

  function openDisableDialog(method: TwoFactorMethod) {
    disableMethodRef.current = method
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
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabledMethods.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Enabled
              </p>
              <div className="space-y-3">
                {enabledMethods.map(({ id, label, description, icon: Icon }) => (
                  <div key={id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <Icon className="size-5 text-emerald-700 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => openDisableDialog(id)}
                    >
                      Disable
                    </Button>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Shield className="size-5 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Backup Codes</p>
                      <p className="text-sm text-muted-foreground">Emergency access codes</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setOpenDialog('backup-codes')}>
                    View Codes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {enabledMethods.length > 0 && availableMethods.length > 0 && <Separator />}

          {availableMethods.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Available
              </p>
              <div className="space-y-3">
                {availableMethods.map(({ id, label, description, icon: Icon }) => (
                  <div key={id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </div>
                    <Button onClick={() => setOpenDialog(`enable-${id}`)}>
                      Enable
                    </Button>
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
        onOpenChange={(o) => { if (!o) { setOpenDialog(null); disableMutation.reset() } }}
        warning={buildDisableWarning(disableMethodRef.current, enabledMethods.length === 1)}
        isPending={disableMutation.isPending}
        error={disableMutation.error as Error | null}
        onSubmit={disableMutation.mutate}
      />
    </>
  )
}
