import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authClient } from '#/auth'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import { BackupCodesDisplay } from './BackupCodesDisplay'

type Step = 1 | 2 | 3

export function BackupCodesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [step, setStep] = useState<Step>(1)
  const [password, setPassword] = useState('')
  const [codes, setCodes] = useState<string[]>([])
  const [savedCodes, setSavedCodes] = useState(false)

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password })
      if (error) throw new Error(error.message ?? 'Failed to generate backup codes')
      return data?.backupCodes ?? []
    },
    onSuccess: (backupCodes) => {
      setCodes(backupCodes)
      setStep(3)
    },
  })

  function reset() {
    setStep(1); setPassword(''); setCodes([]); setSavedCodes(false); regenerate.reset()
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
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
              <DialogTitle>Regenerate Backup Codes</DialogTitle>
              <DialogDescription>This will invalidate all your existing backup codes.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                Are you sure you want to regenerate your backup codes? All existing codes will be permanently invalidated.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm with Password</DialogTitle>
              <DialogDescription>Enter your password to confirm.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="backup-password">Password</Label>
              <Input
                id="backup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && password && !regenerate.isPending) regenerate.mutate() }}
                autoComplete="current-password"
              />
              {regenerate.error && <p className="text-sm text-destructive">{regenerate.error.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { regenerate.reset(); setStep(1) }}>Back</Button>
              <Button variant="destructive" onClick={() => regenerate.mutate()} disabled={!password || regenerate.isPending}>
                {regenerate.isPending ? 'Generating…' : 'Regenerate Codes'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>New Backup Codes</DialogTitle>
              <DialogDescription>Save these somewhere safe. Each code can only be used once.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <BackupCodesDisplay codes={codes} />
              <div className="flex items-center gap-2">
                <Checkbox id="backup-saved-codes" className="cursor-pointer" checked={savedCodes} onCheckedChange={(c) => setSavedCodes(c === true)} />
                <Label htmlFor="backup-saved-codes" className="cursor-pointer">I have saved these codes</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)} disabled={!savedCodes}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
