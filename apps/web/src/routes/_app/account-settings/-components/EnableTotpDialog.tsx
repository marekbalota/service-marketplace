import { useState } from 'react'
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
      if (error) throw new Error(error.message ?? 'An error occurred')
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
      if (error) throw new Error(error.message ?? 'Invalid code')
      return data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
      toast.success('Authenticator app enabled')

      const codes = (data?.backupCodes ?? []).map((code) => ({ code, usedAt: null }))
      if (codes.length > 0) {
        setBackupCodes(codes)
      } else {
        onOpenChange(false)
      }
    },
  })

  function reset() {
    setStep(1); setPassword(''); setTotpURI(''); setOtpCode('')
    setBackupCodes([]); setSavedCodes(false); setShowManualKey(false)
    setup.reset(); verify.reset()
  }

  const manualKey = totpURI
    ? new URL(totpURI).searchParams.get('secret') ?? ''
    : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && (details.reason === 'outside-press' || details.reason === 'escape-key')) return
        onOpenChange(nextOpen)
      }}
      onOpenChangeComplete={(isOpen) => { if (!isOpen) reset() }}
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
                onKeyDown={(e) => { if (e.key === 'Enter' && password && !setup.isPending) setup.mutate() }}
                autoComplete="current-password"
              />
              {setup.error && <p className="text-sm text-destructive">{setup.error.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setup.mutate()} disabled={!password || setup.isPending}>
                {setup.isPending ? 'Verifying…' : 'Continue'}
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
              {totpURI && (
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={totpURI} size={192} />
                </div>
              )}
              <Button variant="link" className="h-auto p-0 text-muted-foreground" onClick={() => setShowManualKey((v) => !v)}>
                {showManualKey ? 'Hide manual key' : "Can't scan? Enter key manually"}
              </Button>
              {showManualKey && (
                <div className="rounded-md bg-muted px-4 py-3 font-mono text-sm break-all text-center">
                  {manualKey}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && !verify.isSuccess && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Code</DialogTitle>
              <DialogDescription>Enter the 6-digit code from your authenticator app.</DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col items-center gap-4">
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
              {verify.error && <p className="text-sm text-destructive">{verify.error.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => verify.mutate()} disabled={otpCode.length !== 6 || verify.isPending}>
                {verify.isPending ? 'Verifying…' : 'Verify'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && verify.isSuccess && (
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
                <Checkbox id="totp-saved-codes" className="cursor-pointer" checked={savedCodes} onCheckedChange={(c) => setSavedCodes(c === true)} />
                <Label htmlFor="totp-saved-codes" className="cursor-pointer">I have saved these codes</Label>
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
