import { useState } from 'react'
import { useController, type Control, type FieldValues } from 'react-hook-form'
import { Lightbulb } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatLocation } from '#/lib/format'
import { profileLocationsQueryOptions } from '#/lib/queries/profiles'
import { Button } from '#/components/ui/button'
import { Field, FieldError } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { LocationAutocomplete, type LocationSuggestion } from '#/components/LocationAutocomplete'

interface LocationFieldProps<T extends FieldValues> {
  control: Control<T, unknown>
  profileId: string
  showSaveHint?: boolean
}

export function LocationField<T extends FieldValues>({
  control: controlProp,
  profileId,
  showSaveHint = false,
}: LocationFieldProps<T>) {
  const { t } = useTranslation()
  const control = controlProp as Control<FieldValues, unknown>
  const { data: previousLocations = [] } = useQuery(profileLocationsQueryOptions(profileId))
  const [isNewLocation, setIsNewLocation] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null)

  const { field: locationIdField } = useController({ control, name: 'locationId' })
  const { field: locationExternalField, fieldState: locationExternalState } = useController({
    control,
    name: 'locationExternalId',
  })

  function handleToggle() {
    setIsNewLocation((prev) => !prev)
    setSelectedLocation(null)
    locationIdField.onChange('')
    locationExternalField.onChange('')
  }

  return (
    <Field>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('createPost.locationOptional')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleToggle}
          >
            {isNewLocation ? t('createPost.usePreviousLocation') : t('createPost.enterNewLocation')}
          </Button>
        </div>

        {!isNewLocation ? (
          <div className="space-y-2">
            <Select
              value={locationIdField.value}
              onValueChange={(v) => {
                locationIdField.onChange(v)
                locationIdField.onBlur()
              }}
              disabled={previousLocations.length === 0}
            >
              <SelectTrigger className="!h-8 w-full">
                <SelectValue placeholder={t('createPost.selectPreviousLocation')}>
                  {locationIdField.value
                    ? formatLocation(
                        previousLocations.find((l) => l.locationId === locationIdField.value) ?? {},
                      ) || undefined
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {previousLocations.map((loc) => (
                  <SelectItem key={loc.locationId} value={loc.locationId}>
                    {formatLocation(loc)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {previousLocations.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('createPost.noPreviousLocations')}</p>
            )}
          </div>
        ) : (
          <Field data-invalid={locationExternalState.invalid}>
            <LocationAutocomplete
              value={selectedLocation}
              onChange={(s) => {
                setSelectedLocation(s)
                locationExternalField.onChange(s?.id ?? '')
                locationExternalField.onBlur()
              }}
            />
            <FieldError errors={[locationExternalState.error]} />
          </Field>
        )}

        {showSaveHint && isNewLocation && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lightbulb className="size-3.5 shrink-0" />
            {t('createPost.locationSaveHint')}
          </p>
        )}
      </div>
    </Field>
  )
}
