import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { LocationAutocomplete, type LocationSuggestion } from '#/components/LocationAutocomplete'

export function AddLocationDialog({
  open,
  onClose,
  onSave,
  isPending,
  error,
}: {
  open: boolean
  onClose: () => void
  onSave: (suggestion: LocationSuggestion) => void
  isPending: boolean
  error?: string
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState<LocationSuggestion | null>(null)

  function handleClose() {
    setValue(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profiles.addLocationTitle')}</DialogTitle>
          <DialogDescription>{t('profiles.addLocationDescription')}</DialogDescription>
        </DialogHeader>
        <LocationAutocomplete value={value} onChange={setValue} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => value && onSave(value)}
            disabled={!value || isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('profiles.addLocation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
