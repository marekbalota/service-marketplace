import { ConfirmDialog } from '#/components/ConfirmDialog'

export function UnbanDialog({
  open,
  userName,
  onConfirm,
  onClose,
}: {
  open: boolean
  userName: string
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  return (
    <ConfirmDialog
      open={open}
      title={`Unban ${userName}?`}
      description="This will restore full access for this user."
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
