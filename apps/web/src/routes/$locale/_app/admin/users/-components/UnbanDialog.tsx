import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  return (
    <ConfirmDialog
      open={open}
      title={t('admin.unban.title', { userName })}
      description={t('admin.unban.description')}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
