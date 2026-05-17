import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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

  const disable = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.twoFactor.disable({ password })
      if (error) throw new Error(error.message ?? 'Wrong password')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFactorStatusQueryOptions.queryKey })
      toast.success('Two-factor authentication disabled')
      handleOpenChange(false)
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) { setPassword(''); disable.reset() }
    onOpenChange(next)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
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
              onKeyDown={(e) => { if (e.key === 'Enter' && password && !disable.isPending) disable.mutate() }}
              autoComplete="current-password"
            />
          </div>
          {disable.error && <p className="text-sm text-destructive">{disable.error.message}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => disable.mutate()} disabled={!password || disable.isPending}>
            {disable.isPending ? 'Disabling…' : 'Disable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
