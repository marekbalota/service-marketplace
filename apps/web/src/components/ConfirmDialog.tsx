import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  isPending,
  reasonLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  isPending?: boolean
  reasonLabel?: string
  onConfirm: (reason?: string) => void | Promise<void>
  onClose: () => void
}) {
  const [internalPending, setInternalPending] = useState(false)
  const [reason, setReason] = useState('')

  const isLoading = isPending ?? internalPending

  const handleConfirm = async () => {
    setInternalPending(true)
    try {
      await onConfirm(reasonLabel ? reason || undefined : undefined)
    } finally {
      setInternalPending(false)
      setReason('')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) { setReason(''); onClose() } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {reasonLabel && (
          <div className="space-y-2">
            <Label htmlFor="confirm-reason">{reasonLabel}</Label>
            <Textarea
              id="confirm-reason"
              placeholder="Describe the reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            className={destructive
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : undefined}
            onClick={handleConfirm}
          >
            {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
