import { Controller, type Control, type FieldValues } from 'react-hook-form'
import { MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatLocation } from '#/lib/format'
import { profileLocationsQueryOptions } from '#/lib/queries/profiles'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Card, CardContent } from '#/components/ui/card'

interface LocationFieldProps<T extends FieldValues> {
  control: Control<T, any>
  profileId: string
  isManualLocation: boolean
  onToggle: () => void
}

export function LocationField<T extends FieldValues>({
  control: controlProp,
  profileId,
  isManualLocation,
  onToggle,
}: LocationFieldProps<T>) {
  // FieldValues (= Record<string,any>) has string-keyed index signature so any literal name is valid inside
  const { t } = useTranslation()
  const control = controlProp as Control<FieldValues, any>
  const { data: previousLocations = [] } = useQuery(profileLocationsQueryOptions(profileId))

  return (
    <Field className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20">
            <MapPin className="size-5 text-orange-600 dark:text-orange-300" />
          </div>
          <span className="text-base font-semibold">{t('createPost.locationOptional')}</span>
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2" onClick={onToggle}>
          <MapPin className="size-4" />
          {isManualLocation
            ? t('createPost.usePreviousLocation')
            : t('createPost.enterNewLocation')}
        </Button>
      </div>

      {!isManualLocation ? (
        <Controller
          control={control}
          name="locationId"
          render={({ field }) => (
            <div className="space-y-2">
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v)
                  field.onBlur()
                }}
                disabled={previousLocations.length === 0}
              >
                <SelectTrigger className="!h-11 w-full">
                  <SelectValue placeholder={t('createPost.selectPreviousLocation')}>
                    {field.value
                      ? formatLocation(
                          previousLocations.find((l) => l.locationId === field.value) ?? {},
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
                <p className="text-sm text-muted-foreground">
                  {t('createPost.noPreviousLocations')}
                </p>
              )}
            </div>
          )}
        />
      ) : (
        <Card className="border-2 border-dashed bg-muted/50">
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Controller
                control={control}
                name="country"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="country">{t('profiles.location.country')}</FieldLabel>
                    <Input
                      {...field}
                      id="country"
                      placeholder={t('profiles.location.countryPlaceholder')}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="region"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="region">{t('profiles.location.region')}</FieldLabel>
                    <Input
                      {...field}
                      id="region"
                      placeholder={t('profiles.location.regionPlaceholder')}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
            <Controller
              control={control}
              name="city"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="city">{t('profiles.location.city')}</FieldLabel>
                  <Input
                    {...field}
                    id="city"
                    placeholder={t('profiles.location.cityPlaceholder')}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Controller
                control={control}
                name="street"
                render={({ field }) => (
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="street">{t('profiles.location.street')}</FieldLabel>
                    <Input
                      {...field}
                      id="street"
                      placeholder={t('profiles.location.streetPlaceholder')}
                    />
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="houseNumber"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="houseNumber">
                      {t('profiles.location.houseNumber')}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="houseNumber"
                      placeholder={t('profiles.location.houseNumberPlaceholder')}
                    />
                  </Field>
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </Field>
  )
}
