import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import i18n from '#/lib/i18n'
import { Flag } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { useMutation, useQuery } from '@tanstack/react-query'
import { reportCategoriesQueryOptions } from '#/lib/queries/reports'

const baseSchema = z.object({
  categoryId: z.uuid(),
  description: z.string().max(1000).optional(),
})

const schemaWithRequiredDescription = baseSchema.superRefine((data, ctx) => {
  if (!data.description?.trim()) {
    ctx.addIssue({ code: 'custom', message: i18n.t('validation.required'), path: ['description'] })
  }
})

type FormData = z.infer<typeof baseSchema>

interface ReportFormProps {
  targetType: 'POST' | 'MESSAGE' | 'REVIEW'
  descriptionRequired?: boolean
  onReport: (data: { categoryId: string; description?: string }) => Promise<void>
  onSuccess: () => void
  onCancel: () => void
}

export function ReportForm({
  targetType,
  descriptionRequired = false,
  onReport,
  onSuccess,
  onCancel,
}: ReportFormProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = descriptionRequired ? schemaWithRequiredDescription : baseSchema

  const { data: categories = [], isLoading: categoriesLoading } = useQuery(
    reportCategoriesQueryOptions(targetType),
  )

  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { categoryId: '' as string, description: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => onReport(data),
    onSuccess,
    onError: (err) => {
      setServerError(err.message)
    },
  })

  const onSubmit: SubmitHandler<FormData> = (data) => {
    setServerError(null)
    mutation.mutate(data)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border border-destructive/30 bg-card p-4"
    >
      <FieldGroup>
        <Controller
          name="categoryId"
          control={control}
          render={({ field, fieldState }) => {
            const selectedLabel = categories.find((c) => c.categoryId === field.value)?.label
            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>{t('report.category')}</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    field.onBlur()
                  }}
                  disabled={mutation.isPending || categoriesLoading}
                >
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue
                      placeholder={
                        categoriesLoading ? t('common.loading') : t('report.selectReason')
                      }
                    >
                      {selectedLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.categoryId} value={cat.categoryId}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )
          }}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>
                {descriptionRequired ? t('report.descriptionRequired') : t('report.description')}
              </FieldLabel>
              <Textarea
                placeholder={t('report.descriptionPlaceholder')}
                maxLength={1000}
                rows={3}
                aria-invalid={fieldState.invalid}
                disabled={mutation.isPending}
                {...field}
                value={field.value ?? ''}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <FieldError errors={[{ message: serverError ?? undefined }]} />

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={mutation.isPending || categoriesLoading}
          className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <Flag className="size-4" />
          {mutation.isPending ? t('common.submitting') : t('report.submit')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
