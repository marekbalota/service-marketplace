import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
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

type Step = 1 | 2 | 3 | 4

export function EnableTotpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [step, setStep] = useState<Step>(1)
  const [password, setPassword] = useState('')
  const [totpURI, setTotpURI] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savedCodes, setSavedCodes] = useState(false)
  const [showManualKey, setShowManualKey] = useState(false)

  function reset() {
    setStep(1); setPassword(''); setTotpURI(''); setBackupCodes([])
    setOtpCode(''); setError(null); setLoading(false)
    setSavedCodes(false); setShowManualKey(false)
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
    setTotpURI(data?.totpURI ?? '')
    setBackupCodes(data?.backupCodes ?? [])
    setStep(2)
  }

  async function handleStep3() {
    setError(null); setLoading(true)
    const { error } = await authClient.twoFactor.verifyTotp({ code: otpCode })
    setLoading(false)
    if (error) { setError(error.message ?? 'Invalid code'); return }
    setStep(4)
  }

  async function handleDone() {
    await queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
    toast.success('Authenticator app enabled')
    handleOpenChange(false)
  }

  const manualKey = totpURI
    ? new URL(totpURI).searchParams.get('secret') ?? ''
    : ''

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
              <DialogTitle>Enable Authenticator App</DialogTitle>
              <DialogDescription>Enter your password to continue.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="totp-password">Password</Label>
              <Input
                id="totp-password"
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
              <DialogTitle>Scan the QR Code</DialogTitle>
              <DialogDescription>Open your authenticator app and scan the code below.</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col items-center gap-4">
              {totpURI && <QRCodeSVG value={totpURI} size={192} />}
              <button
                type="button"
                className="text-sm text-muted-foreground underline underline-offset-2"
                onClick={() => setShowManualKey((v) => !v)}
              >
                {showManualKey ? 'Hide manual key' : "Can't scan? Enter key manually"}
              </button>
              {showManualKey && (
                <div className="w-full rounded-md bg-muted px-4 py-3 font-mono text-sm break-all">
                  {manualKey}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Code</DialogTitle>
              <DialogDescription>Enter the 6-digit code from your authenticator app.</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col items-center gap-4">
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
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleStep3} disabled={otpCode.length !== 6 || loading}>
                {loading ? 'Verifying…' : 'Verify'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>Store these codes somewhere safe. Each code can only be used once.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                If you lose access to your authenticator app, these codes are your only way in.
              </div>
              <BackupCodesDisplay codes={backupCodes} />
              <div className="flex items-center gap-2">
                <Checkbox id="totp-saved-codes" checked={savedCodes} onCheckedChange={(c) => setSavedCodes(c === true)} />
                <Label htmlFor="totp-saved-codes">I have saved these codes</Label>
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
