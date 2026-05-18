import { useState } from 'react'
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
  warning,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  warning: string
  isPending: boolean
  error: Error | null
  onSubmit: (password: string) => void
}) {
  const [password, setPassword] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) setPassword('')
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} onOpenChangeComplete={(isOpen) => { if (!isOpen) setPassword('') }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>Enter your password to confirm.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {warning}
          </div>
          <div className="space-y-2">
            <Label htmlFor="disable-2fa-password">Password</Label>
            <Input
              id="disable-2fa-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && password && !isPending) onSubmit(password) }}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error.message}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => onSubmit(password)} disabled={!password || isPending}>
            {isPending ? 'Disabling…' : 'Disable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
