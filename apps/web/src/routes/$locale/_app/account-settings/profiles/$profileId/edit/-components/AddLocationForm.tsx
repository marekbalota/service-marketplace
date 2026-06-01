import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent } from '#/components/ui/card'

export interface LocationDraft {
  country: string
  region: string
  city: string
  street: string
  houseNumber: string
}

export const EMPTY_LOCATION: LocationDraft = {
  country: '',
  region: '',
  city: '',
  street: '',
  houseNumber: '',
}

export function AddLocationForm({
  value,
  onChange,
  onSave,
  onCancel,
  isPending,
  error,
}: {
  value: LocationDraft
  onChange: (patch: Partial<LocationDraft>) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  error?: string
}) {
  const { t } = useTranslation()
  return (
    <Card className="border-2 border-primary/20 bg-muted/40">
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="loc-country">{t('profiles.location.country')} *</Label>
            <Input
              id="loc-country"
              placeholder={t('profiles.location.countryPlaceholder')}
              value={value.country}
              onChange={(e) => onChange({ country: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-region">{t('profiles.location.region')}</Label>
            <Input
              id="loc-region"
              placeholder={t('profiles.location.regionPlaceholder')}
              value={value.region}
              onChange={(e) => onChange({ region: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="loc-city">{t('profiles.location.city')}</Label>
            <Input
              id="loc-city"
              placeholder={t('profiles.location.cityPlaceholder')}
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-street">{t('profiles.location.street')}</Label>
            <Input
              id="loc-street"
              placeholder={t('profiles.location.streetPlaceholder')}
              value={value.street}
              onChange={(e) => onChange({ street: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2 md:w-1/2">
          <Label htmlFor="loc-house">{t('profiles.location.houseNumber')}</Label>
          <Input
            id="loc-house"
            placeholder={t('profiles.location.houseNumberPlaceholder')}
            value={value.houseNumber}
            onChange={(e) => onChange({ houseNumber: e.target.value })}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={!value.country || isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('profiles.addLocation')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
