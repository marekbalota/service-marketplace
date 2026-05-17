import { useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { twoFactorStatusQueryOptions } from '#/lib/queries/two-factor'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export function DisableMethodDialog({
  open,
  onOpenChange,
  isOnlyMethod,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isOnlyMethod: boolean
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function reset() {
    setPassword(''); setError(null); setLoading(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleDisable() {
    setError(null); setLoading(true)
    const { error } = await authClient.twoFactor.disable({ password })
    setLoading(false)
    if (error) { setError(error.message ?? 'Wrong password'); return }
    await queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
    toast.success('Two-factor authentication disabled')
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
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>Enter your password to confirm.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This will remove all two-factor authentication methods from your account.
            {isOnlyMethod && (
              <span className="block mt-1">
                This will turn off two-factor authentication for your account entirely.
              </span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="disable-2fa-password">Password</Label>
            <Input
              id="disable-2fa-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDisable} disabled={!password || loading}>
            {loading ? 'Disabling…' : 'Disable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
