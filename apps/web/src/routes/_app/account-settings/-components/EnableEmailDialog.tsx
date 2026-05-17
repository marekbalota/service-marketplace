import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { twoFactorStatusQueryOptions } from '#/lib/queries/two-factor'
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
  const [codeSent, setCodeSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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

  function reset() {
    setStep(1); setPassword(''); setBackupCodes([]); setOtpCode('')
    setCodeSent(false); setResendCooldown(0); setError(null)
    setLoading(false); setSavedCodes(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleStep1() {
    setError(null); setLoading(true)
    const { data, error } = await authClient.twoFactor.enable({ password })
    setLoading(false)
    if (error) { setError(error.message ?? 'An error occurred'); return }
    setBackupCodes(data?.backupCodes ?? [])
    setStep(2)
  }

  async function handleSendCode() {
    setError(null); setLoading(true)
    const { error } = await authClient.twoFactor.sendOtp()
    setLoading(false)
    if (error) { setError(error.message ?? 'Failed to send code'); return }
    setCodeSent(true); setResendCooldown(60)
  }

  async function handleVerify() {
    setError(null); setLoading(true)
    const { error } = await authClient.twoFactor.verifyOtp({ code: otpCode })
    setLoading(false)
    if (error) { setError(error.message ?? 'Invalid code'); return }
    setStep(3)
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
        if (!nextOpen && details.reason === 'outside-press') return
        handleOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
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
                autoComplete="current-password"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleStep1} disabled={!password || loading}>
                {loading ? 'Verifying…' : 'Continue'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Your Email</DialogTitle>
              <DialogDescription>We'll send a 6-digit code to your email address.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {!codeSent ? (
                <Button onClick={handleSendCode} disabled={loading} className="w-full">
                  {loading ? 'Sending…' : 'Send Code'}
                </Button>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-4">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <input
                      aria-hidden
                      tabIndex={-1}
                      className="sr-only"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    {resendCooldown > 0 ? (
                      `Resend in 0:${String(resendCooldown).padStart(2, '0')}`
                    ) : (
                      <button type="button" className="underline underline-offset-2" onClick={handleSendCode}>
                        Resend code
                      </button>
                    )}
                  </div>
                </>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              {codeSent && (
                <Button onClick={handleVerify} disabled={otpCode.length !== 6 || loading}>
                  {loading ? 'Verifying…' : 'Verify'}
                </Button>
              )}
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
                <Checkbox id="email-saved-codes" checked={savedCodes} onCheckedChange={(c) => setSavedCodes(c === true)} />
                <Label htmlFor="email-saved-codes">I have saved my backup codes</Label>
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
