import { Controller, type Control, type FieldValues } from 'react-hook-form'
import { DollarSign } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

interface PricingFieldProps<T extends FieldValues> {
  control: Control<T, any, T>
  priceValue: string | undefined
}

export function PricingField<T extends FieldValues>({ control: controlProp, priceValue }: PricingFieldProps<T>) {
  // FieldValues (= Record<string,any>) has string-keyed index signature so any literal name is valid inside
  const control = controlProp as Control<FieldValues, any, FieldValues>
  return (
    <Field className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
          <DollarSign className="size-5 text-emerald-600" />
        </div>
        <span className="text-base font-semibold">Pricing (Optional)</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name="price"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="price">Price ($)</FieldLabel>
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
              <FieldLabel>Rate Type</FieldLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => { field.onChange(v); field.onBlur() }}
                disabled={!priceValue}
              >
                <SelectTrigger className="!h-11 w-full">
                  <SelectValue placeholder="Select rate type">
                    {field.value === 'HOURLY'
                      ? 'Hourly Rate'
                      : field.value === 'DAILY'
                        ? 'Daily Rate'
                        : field.value === 'FIXED'
                          ? 'Fixed Price'
                          : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOURLY">Hourly Rate</SelectItem>
                  <SelectItem value="DAILY">Daily Rate</SelectItem>
                  <SelectItem value="FIXED">Fixed Price</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
      <p className="text-sm text-muted-foreground">Leave price empty if negotiable</p>
    </Field>
  )
}
