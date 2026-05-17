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
import { BackupCodesDisplay } from './BackupCodesDisplay'

type Step = 1 | 2 | 3

export function EnableEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [step, setStep] = useState<Step>(1)
  const [password, setPassword] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [otpCode, setOtpCode] = useState('')
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
      const { error } = await authClient.twoFactor.sendOtp()
      if (error) throw new Error(error.message ?? 'Failed to send code')
    },
    onSuccess: () => setResendCooldown(60),
  })

  const enable = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.twoFactor.enable({ password })
      if (error) throw new Error(error.message ?? 'An error occurred')
      return data
    },
    onSuccess: (data) => {
      setBackupCodes(data?.backupCodes ?? [])
      setStep(2)
      sendCode.mutate()
    },
  })

  const verify = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.twoFactor.verifyOtp({ code: otpCode })
      if (error) throw new Error(error.message ?? 'Invalid code')
    },
    onSuccess: () => setStep(3),
  })

  function reset() {
    setStep(1); setPassword(''); setBackupCodes([]); setOtpCode('')
    setSavedCodes(false)
    enable.reset(); sendCode.reset(); verify.reset()
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
  }

  async function handleDone() {
    await queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
    toast.success('Email 2FA enabled')
    handleOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && (details.reason === 'outside-press' || details.reason === 'escape-key')) return
        handleOpenChange(nextOpen)
      }}
      onOpenChangeComplete={(isOpen) => { if (!isOpen) reset() }}
    >
      <DialogContent className="sm:max-w-[520px]" showCloseButton={step !== 3}>
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
                onKeyDown={(e) => { if (e.key === 'Enter' && password && !enable.isPending) enable.mutate() }}
                autoComplete="current-password"
              />
              {enable.error && <p className="text-sm text-destructive">{enable.error.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={() => enable.mutate()} disabled={!password || enable.isPending}>
                {enable.isPending ? 'Verifying…' : 'Continue'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
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
                  onKeyDown={(e) => { if (e.key === 'Enter' && otpCode.length === 6 && !verify.isPending) verify.mutate() }}
                >
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPGroup key={i}>
                      <InputOTPSlot index={i} className="size-12 text-base" />
                    </InputOTPGroup>
                  ))}
                </InputOTP>
              </div>
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
              {(sendCode.error || verify.error) && (
                <p className="text-sm text-destructive">{(sendCode.error ?? verify.error)?.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={() => verify.mutate()} disabled={otpCode.length !== 6 || verify.isPending}>
                {verify.isPending ? 'Verifying…' : 'Verify'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>Store these codes somewhere safe. Each can only be used once.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                Keep these codes secure. You'll need them if you can't access your email.
              </div>
              <BackupCodesDisplay codes={backupCodes} />
              <div className="flex items-center gap-2">
                <Checkbox id="email-saved-codes" className="cursor-pointer" checked={savedCodes} onCheckedChange={(c) => setSavedCodes(c === true)} />
                <Label htmlFor="email-saved-codes" className="cursor-pointer">I have saved my backup codes</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleDone} disabled={!savedCodes}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
