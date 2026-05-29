import { useEffect } from 'react'
import { useForm, Controller, type SubmitHandler, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '#/lib/api-error'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'

const categorySchema = z.object({
  name: z.string().min(1),
})

export type CategoryValues = z.infer<typeof categorySchema>

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  defaultValues?: { name: string }
  onSubmit: (values: CategoryValues) => Promise<void>
}

export function CategoryDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  defaultValues,
  onSubmit,
}: CategoryDialogProps) {
  const { t } = useTranslation()

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    mode: 'onTouched',
    defaultValues: { name: defaultValues?.name ?? '' },
  })

  const nameValue = useWatch({ control, name: 'name' })

  useEffect(() => {
    if (open) {
      reset({ name: defaultValues?.name ?? '' })
    }
  }, [open, defaultValues, reset])

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const submit: SubmitHandler<CategoryValues> = async (values) => {
    try {
      await onSubmit(values)
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 409) {
        setError('name', { message: t('admin.categories.nameConflict') })
      } else {
        setError('root', { message: t('errors.generic') })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4 pt-2">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Label htmlFor="category-name">{t('admin.categories.categoryName')}</Label>
                <Input
                  {...field}
                  id="category-name"
                  placeholder={t('admin.categories.categoryNamePlaceholder')}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <FieldError errors={[errors.root]} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !nameValue?.trim()}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
