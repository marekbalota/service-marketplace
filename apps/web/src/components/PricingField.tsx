import { useTranslation } from 'react-i18next'
import { Controller, type Control, type FieldValues } from 'react-hook-form'
import { DollarSign } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { FieldIconHeader } from '#/components/FieldIconHeader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

interface PricingFieldProps<T extends FieldValues> {
  control: Control<T, any>
  priceValue: string | undefined
}

export function PricingField<T extends FieldValues>({
  control: controlProp,
  priceValue,
}: PricingFieldProps<T>) {
  const { t } = useTranslation()
  // FieldValues (= Record<string,any>) has string-keyed index signature so any literal name is valid inside
  const control = controlProp as Control<FieldValues, any>

  const rateTypes = [
    { value: 'HOURLY', label: t('pricing.hourly') },
    { value: 'DAILY', label: t('pricing.daily') },
    { value: 'FIXED', label: t('pricing.fixed') },
  ] as const

  return (
    <Field>
      <FieldIconHeader
        icon={DollarSign}
        iconBgClassName="bg-emerald-100 dark:bg-emerald-500/20"
        iconClassName="text-emerald-600 dark:text-emerald-300"
        label={t('pricing.label')}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name="price"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="price">{t('pricing.price')}</FieldLabel>
              <Input
                {...field}
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="h-11"
              />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="rateType"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('pricing.rateType')}</FieldLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => {
                  field.onChange(v)
                  field.onBlur()
                }}
                disabled={!priceValue}
              >
                <SelectTrigger className="!h-11 w-full">
                  <SelectValue placeholder={t('pricing.selectRateType')}>
                    {rateTypes.find((r) => r.value === field.value)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rateTypes.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
    </Field>
  )
}
