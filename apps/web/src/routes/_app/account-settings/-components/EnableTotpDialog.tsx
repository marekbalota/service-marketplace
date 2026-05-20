import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { twoFactorStatusQueryOptions } from '#/lib/queries/two-factor'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '#/components/ui/input-otp'
import { BackupCodesDisplay, type BackupCodeEntry } from './BackupCodesDisplay'

type Step = 1 | 2 | 3

export function EnableTotpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>(1)
  const [password, setPassword] = useState('')
  const [totpURI, setTotpURI] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<BackupCodeEntry[]>([])
  const [savedCodes, setSavedCodes] = useState(false)
  const [showManualKey, setShowManualKey] = useState(false)

  const setup = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.twoFactor.setupTotp({ password })
      if (error) throw new Error(error.message ?? t('twoFactor.enableTotp.errorOccurred'))
      return data
    },
    onSuccess: (data) => {
      setTotpURI(data?.uri ?? '')
      setStep(2)
    },
  })

  const verify = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.twoFactor.enableTotp({ code: otpCode })
      if (error) throw new Error(error.message ?? t('twoFactor.enableTotp.errorInvalidCode'))
      return data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
      toast.success(t('twoFactor.section.toast.totpEnabled'))

      const codes = (data?.backupCodes ?? []).map((code) => ({ code, usedAt: null }))
      if (codes.length > 0) {
        setBackupCodes(codes)
      } else {
        onOpenChange(false)
      }
    },
  })

  function reset() {
    setStep(1)
    setPassword('')
    setTotpURI('')
    setOtpCode('')
    setBackupCodes([])
    setSavedCodes(false)
    setShowManualKey(false)
    setup.reset()
    verify.reset()
  }

  const manualKey = totpURI ? (new URL(totpURI).searchParams.get('secret') ?? '') : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && (details.reason === 'outside-press' || details.reason === 'escape-key'))
          return
        onOpenChange(nextOpen)
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) reset()
      }}
    >
      <DialogContent className="sm:max-w-[520px]" showCloseButton={!verify.isSuccess}>
        <div className="flex justify-center gap-1.5 pt-1">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                'rounded-full transition-all',
                s === step ? 'size-2 bg-foreground' : 'size-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.enableTotp.step1Title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.common.enterPasswordToContinue')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="totp-password">{t('twoFactor.common.password')}</Label>
              <Input
                id="totp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !setup.isPending) setup.mutate()
                }}
                autoComplete="current-password"
              />
              {setup.error && <p className="text-sm text-destructive">{setup.error.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => setup.mutate()} disabled={!password || setup.isPending}>
                {setup.isPending ? t('twoFactor.common.verifying') : t('twoFactor.common.continue')}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.enableTotp.step2Title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.enableTotp.step2Description')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col items-center gap-4">
              {totpURI && (
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={totpURI} size={192} />
                </div>
              )}
              <Button
                variant="link"
                className="h-auto p-0 text-muted-foreground"
                onClick={() => setShowManualKey((v) => !v)}
              >
                {showManualKey
                  ? t('twoFactor.enableTotp.hideKey')
                  : t('twoFactor.enableTotp.cantScan')}
              </Button>
              {showManualKey && (
                <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm break-all text-center">
                  {manualKey}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => setStep(3)}>{t('twoFactor.enableTotp.next')}</Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && !verify.isSuccess && (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.enableTotp.step3Title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.enableTotp.step3Description')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col items-center gap-4">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
                containerClassName="gap-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && otpCode.length === 6 && !verify.isPending)
                    verify.mutate()
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPGroup key={i}>
                    <InputOTPSlot index={i} className="size-12 text-base" />
                  </InputOTPGroup>
                ))}
              </InputOTP>
              {verify.error && <p className="text-sm text-destructive">{verify.error.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => verify.mutate()}
                disabled={otpCode.length !== 6 || verify.isPending}
              >
                {verify.isPending ? t('twoFactor.common.verifying') : t('twoFactor.common.verify')}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && verify.isSuccess && backupCodes.length > 0 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.enableTotp.step4Title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.enableTotp.step4Description')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                {t('twoFactor.enableTotp.warningMessage')}
              </div>
              <BackupCodesDisplay codes={backupCodes} />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="totp-saved-codes"
                  className="cursor-pointer"
                  checked={savedCodes}
                  onCheckedChange={(c) => setSavedCodes(c === true)}
                />
                <Label htmlFor="totp-saved-codes" className="cursor-pointer">
                  {t('twoFactor.common.savedCodes')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} disabled={!savedCodes}>
                {t('twoFactor.common.done')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
