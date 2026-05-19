import { useTranslation } from 'react-i18next'
import { Controller, type Control, type FieldValues } from 'react-hook-form'
import { FileText } from 'lucide-react'
import { FieldIconHeader } from '#/components/FieldIconHeader'
import { Input } from '#/components/ui/input'
import { Field, FieldError } from '#/components/ui/field'

interface PostTitleFieldProps<T extends FieldValues> {
  control: Control<T, any>
}

export function PostTitleField<T extends FieldValues>({
  control: controlProp,
}: PostTitleFieldProps<T>) {
  const { t } = useTranslation()
  const control = controlProp as Control<FieldValues, any>

  return (
    <Controller
      control={control}
      name="postTitle"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldIconHeader
            icon={FileText}
            iconBgClassName="bg-blue-100 dark:bg-blue-500/20"
            iconClassName="text-blue-600 dark:text-blue-300"
            label={t('createPost.titleLabel')}
            htmlFor="postTitle"
          />
          <p className="text-sm text-muted-foreground">{t('createPost.titleHint')}</p>
          <Input
            {...field}
            id="postTitle"
            placeholder={t('createPost.titlePlaceholder')}
            className="h-11"
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
