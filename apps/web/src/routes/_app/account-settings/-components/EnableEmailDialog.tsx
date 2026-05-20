import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { twoFactorStatusQueryOptions } from '#/lib/queries/two-factor'
import { formatCountdown } from '#/lib/format'
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

type Step = 1 | 2

export function EnableEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>(1)
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<BackupCodeEntry[]>([])
  const [resendCooldown, setResendCooldown] = useState(0)
  const [savedCodes, setSavedCodes] = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(id)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  const sendCode = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.twoFactor.setupEmail({ password })
      if (error) throw new Error(error.message ?? t('twoFactor.enableEmail.errorSend'))
    },
    onSuccess: () => setResendCooldown(60),
  })

  const enableEmail = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.twoFactor.enableEmail({ code: otpCode })
      if (error) throw new Error(error.message ?? t('twoFactor.enableEmail.errorInvalidCode'))
      return data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
      toast.success(t('twoFactor.section.toast.emailEnabled'))

      const codes = data?.backupCodes ?? []
      if (codes.length > 0) {
        setBackupCodes(codes.map((code) => ({ code, usedAt: null })))
      } else {
        onOpenChange(false)
      }
    },
  })

  function reset() {
    setStep(1)
    setPassword('')
    setOtpCode('')
    setBackupCodes([])
    setResendCooldown(0)
    setSavedCodes(false)
    sendCode.reset()
    enableEmail.reset()
  }

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
      <DialogContent className="sm:max-w-[520px]" showCloseButton={!enableEmail.isSuccess}>
        <div className="flex justify-center gap-1.5 pt-1">
          {([1, 2] as Step[]).map((s) => (
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
              <DialogTitle>{t('twoFactor.enableEmail.step1Title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.common.enterPasswordToContinue')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="email-otp-password">{t('twoFactor.common.password')}</Label>
              <Input
                id="email-otp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !sendCode.isPending)
                    sendCode.mutate(undefined, { onSuccess: () => setStep(2) })
                }}
                autoComplete="current-password"
              />
              {sendCode.error && (
                <p className="text-sm text-destructive">{sendCode.error.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => sendCode.mutate(undefined, { onSuccess: () => setStep(2) })}
                disabled={!password || sendCode.isPending}
              >
                {sendCode.isPending
                  ? t('twoFactor.common.sending')
                  : t('twoFactor.common.continue')}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && !enableEmail.isSuccess && (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.enableEmail.step2Title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.enableEmail.step2Description')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  containerClassName="gap-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && otpCode.length === 6 && !enableEmail.isPending)
                      enableEmail.mutate()
                  }}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPGroup key={i}>
                      <InputOTPSlot index={i} className="size-12 text-base" />
                    </InputOTPGroup>
                  ))}
                </InputOTP>
                <div className="text-center text-sm text-muted-foreground">
                  {sendCode.isPending && t('twoFactor.common.sendingCode')}
                  {!sendCode.isPending &&
                    resendCooldown > 0 &&
                    t('twoFactor.common.resendIn', { countdown: formatCountdown(resendCooldown) })}
                  {!sendCode.isPending && resendCooldown === 0 && (
                    <Button variant="link" className="h-auto p-0" onClick={() => sendCode.mutate()}>
                      {t('twoFactor.common.resendCode')}
                    </Button>
                  )}
                </div>
                {(sendCode.error || enableEmail.error) && (
                  <p className="text-sm text-destructive">
                    {(sendCode.error ?? enableEmail.error)?.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => enableEmail.mutate()}
                disabled={otpCode.length !== 6 || enableEmail.isPending}
              >
                {enableEmail.isPending
                  ? t('twoFactor.common.verifying')
                  : t('twoFactor.common.verify')}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && enableEmail.isSuccess && backupCodes.length > 0 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.enableEmail.step3Title')}</DialogTitle>
              <DialogDescription>{t('twoFactor.enableEmail.step3Description')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                {t('twoFactor.enableEmail.warningMessage')}
              </div>
              <BackupCodesDisplay codes={backupCodes} />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="email-saved-codes"
                  className="cursor-pointer"
                  checked={savedCodes}
                  onCheckedChange={(c) => setSavedCodes(c === true)}
                />
                <Label htmlFor="email-saved-codes" className="cursor-pointer">
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
