import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'

export function ChangeEmailDialog({
  open,
  onOpenChange,
}: {
  open:          boolean
  onOpenChange:  (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
          <DialogDescription>Update your account email address.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">New Email</Label>
            <Input id="new-email" type="email" placeholder="new@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-current-password">Current Password</Label>
            <Input id="email-current-password" type="password" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled title="Coming soon">Change Email</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
