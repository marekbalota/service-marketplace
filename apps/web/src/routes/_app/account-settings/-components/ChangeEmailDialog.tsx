import { useTranslation } from 'react-i18next'
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

export function ChangeEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('accountSettings.changeEmailDialog.title')}</DialogTitle>
          <DialogDescription>{t('accountSettings.changeEmailDialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">{t('accountSettings.changeEmailDialog.newEmail')}</Label>
            <Input id="new-email" type="email" placeholder={t('accountSettings.changeEmailDialog.newEmailPlaceholder')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-current-password">{t('accountSettings.changeEmailDialog.currentPassword')}</Label>
            <Input id="email-current-password" type="password" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled title={t('accountSettings.comingSoon')}>
            {t('accountSettings.changeEmail')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
