import { useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import { BackupCodesDisplay } from './BackupCodesDisplay'

type Step = 1 | 2

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
  const [activeTab, setActiveTab] = useState('current')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setStep(1); setPassword(''); setCodes([]); setActiveTab('current')
    setError(null); setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleViewCodes() {
    setError(null); setLoading(true)
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password })
    setLoading(false)
    if (error) { setError(error.message ?? 'Wrong password'); return }
    setCodes(data?.backupCodes ?? [])
    setStep(2)
  }

  async function handleRegenerate() {
    setLoading(true)
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password })
    setLoading(false)
    if (error) { toast.error(error.message ?? 'Failed to regenerate'); return }
    setCodes(data?.backupCodes ?? [])
    setActiveTab('current')
    toast.success('Backup codes regenerated')
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
              <DialogTitle>Backup Codes</DialogTitle>
              <DialogDescription>Enter your password to view your backup codes.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="backup-password">Password</Label>
              <Input
                id="backup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleViewCodes} disabled={!password || loading}>
                {loading ? 'Verifying…' : 'View Codes'}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Backup Codes</DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="current" className="flex-1">Current Codes</TabsTrigger>
                <TabsTrigger value="regenerate" className="flex-1">Regenerate</TabsTrigger>
              </TabsList>
              <TabsContent value="current" className="pt-4">
                <BackupCodesDisplay codes={codes} />
              </TabsContent>
              <TabsContent value="regenerate" className="pt-4 space-y-4">
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                  Regenerating will invalidate all existing codes.
                </div>
                <Button variant="destructive" className="w-full" onClick={handleRegenerate} disabled={loading}>
                  {loading ? 'Regenerating…' : 'Regenerate Codes'}
                </Button>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
