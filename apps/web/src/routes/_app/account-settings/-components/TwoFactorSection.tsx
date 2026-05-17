import { useState } from 'react'
import { Mail, Smartphone, Shield } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Separator } from '#/components/ui/separator'
import { twoFactorStatusQueryOptions } from '#/lib/queries/two-factor'
import { EnableTotpDialog } from './EnableTotpDialog'
import { EnableEmailDialog } from './EnableEmailDialog'
import { BackupCodesDialog } from './BackupCodesDialog'
import { DisableMethodDialog } from './DisableMethodDialog'

type DialogId = 'enable-totp' | 'enable-email' | 'backup-codes' | 'disable-totp' | 'disable-email'

const METHODS = [
  { id: 'totp' as const, label: 'Authenticator App', description: 'Use an app like Google Authenticator or Authy', icon: Smartphone },
  { id: 'email' as const, label: 'Email', description: 'Receive a verification code via email', icon: Mail },
] as const

type MethodId = (typeof METHODS)[number]['id']

function isEnabled(methodId: MethodId, data: { twoFactorEnabled: boolean; totpEnabled: boolean }) {
  if (methodId === 'totp') return data.totpEnabled
  return data.twoFactorEnabled
}

export function TwoFactorSection() {
  const { data, isLoading } = useQuery(twoFactorStatusQueryOptions)
  const [openDialog, setOpenDialog] = useState<DialogId | null>(null)

  if (isLoading || !data) {
    return (
      <Card id="two-factor-auth">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Add an extra layer of security to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-14 w-full" data-testid="skeleton" />
          <Skeleton className="h-14 w-full" data-testid="skeleton" />
        </CardContent>
      </Card>
    )
  }

  const enabledMethods = METHODS.filter((m) => isEnabled(m.id, data))
  const availableMethods = METHODS.filter((m) => !isEnabled(m.id, data))
  const hasAny = data.twoFactorEnabled
  const enabledCount = enabledMethods.length

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
                      size="sm"
                      variant="destructive"
                      onClick={() => setOpenDialog(`disable-${id}`)}
                    >
                      Disable
                    </Button>
                  </div>
                ))}
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
                    <Button size="sm" onClick={() => setOpenDialog(`enable-${id}`)}>
                      Enable
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasAny && (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Shield className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Backup Codes</p>
                    <p className="text-sm text-muted-foreground">Emergency access codes</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenDialog('backup-codes')}>
                  View / Regenerate
                </Button>
              </div>
            </>
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
        onOpenChange={(o) => !o && setOpenDialog(null)}
        isOnlyMethod={enabledCount === 1}
      />
    </>
  )
}
