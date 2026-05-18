import { useState, useEffect } from 'react'
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
        if (s <= 1) { clearInterval(id); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  const sendCode = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.twoFactor.setupEmail({ password })
      if (error) throw new Error(error.message ?? 'Failed to send code')
    },
    onSuccess: () => setResendCooldown(60),
  })

  const enableEmail = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.twoFactor.enableEmail({ code: otpCode })
      if (error) throw new Error(error.message ?? 'Invalid code')
      return data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
      toast.success('Email 2FA enabled')

      const codes = data?.backupCodes ?? []
      if (codes.length > 0) {
        setBackupCodes(codes.map((code) => ({ code, usedAt: null })))
      } else {
        onOpenChange(false)
      }
    },
  })

  function reset() {
    setStep(1); setPassword(''); setOtpCode(''); setBackupCodes([])
    setResendCooldown(0); setSavedCodes(false)
    sendCode.reset(); enableEmail.reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && (details.reason === 'outside-press' || details.reason === 'escape-key')) return
        onOpenChange(nextOpen)
      }}
      onOpenChangeComplete={(isOpen) => { if (!isOpen) reset() }}
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
              <DialogTitle>Enable Email Verification</DialogTitle>
              <DialogDescription>Enter your password to continue.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="email-otp-password">Password</Label>
              <Input
                id="email-otp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && password && !sendCode.isPending) sendCode.mutate(undefined, { onSuccess: () => setStep(2) }) }}
                autoComplete="current-password"
              />
              {sendCode.error && <p className="text-sm text-destructive">{sendCode.error.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => sendCode.mutate(undefined, { onSuccess: () => setStep(2) })} disabled={!password || sendCode.isPending}>
                {sendCode.isPending ? 'Sending…' : 'Continue'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && !enableEmail.isSuccess && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Your Email</DialogTitle>
              <DialogDescription>We sent a 6-digit code to your email address.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  containerClassName="gap-2"
                  onKeyDown={(e) => { if (e.key === 'Enter' && otpCode.length === 6 && !enableEmail.isPending) enableEmail.mutate() }}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPGroup key={i}>
                      <InputOTPSlot index={i} className="size-12 text-base" />
                    </InputOTPGroup>
                  ))}
                </InputOTP>
                <div className="text-center text-sm text-muted-foreground">
                  {sendCode.isPending && 'Sending code…'}
                  {!sendCode.isPending && resendCooldown > 0 && (
                    `Resend in ${formatCountdown(resendCooldown)}`
                  )}
                  {!sendCode.isPending && resendCooldown === 0 && (
                    <Button variant="link" className="h-auto p-0" onClick={() => sendCode.mutate()}>
                      Resend code
                    </Button>
                  )}
                </div>
                {(sendCode.error || enableEmail.error) && (
                  <p className="text-sm text-destructive">{(sendCode.error ?? enableEmail.error)?.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => enableEmail.mutate()} disabled={otpCode.length !== 6 || enableEmail.isPending}>
                {enableEmail.isPending ? 'Verifying…' : 'Verify'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && enableEmail.isSuccess && (
          <>
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>Save these somewhere safe. Each code can only be used once.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                If you lose access to your email, these codes are your only way in.
              </div>
              <BackupCodesDisplay codes={backupCodes} />
              <div className="flex items-center gap-2">
                <Checkbox id="email-saved-codes" className="cursor-pointer" checked={savedCodes} onCheckedChange={(c) => setSavedCodes(c === true)} />
                <Label htmlFor="email-saved-codes" className="cursor-pointer">I have saved these codes</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} disabled={!savedCodes}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
