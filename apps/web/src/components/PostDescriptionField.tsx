import { useTranslation } from 'react-i18next'
import { Controller, type Control, type FieldValues } from 'react-hook-form'
import { AlignLeft } from 'lucide-react'
import { FieldIconHeader } from '#/components/FieldIconHeader'
import { Textarea } from '#/components/ui/textarea'
import { Field, FieldError } from '#/components/ui/field'

interface PostDescriptionFieldProps<T extends FieldValues> {
  control: Control<T, any>
}

export function PostDescriptionField<T extends FieldValues>({
  control: controlProp,
}: PostDescriptionFieldProps<T>) {
  const { t } = useTranslation()
  const control = controlProp as Control<FieldValues, any>

  return (
    <Controller
      control={control}
      name="description"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldIconHeader
            icon={AlignLeft}
            iconBgClassName="bg-purple-100 dark:bg-purple-500/20"
            iconClassName="text-purple-600 dark:text-purple-300"
            label={t('createPost.descriptionLabel')}
            htmlFor="description"
          />
          <p className="text-sm text-muted-foreground">{t('createPost.descriptionHint')}</p>
          <Textarea
            {...field}
            id="description"
            placeholder={t('createPost.descriptionPlaceholder')}
            rows={3}
            className="resize-none overflow-hidden"
            aria-invalid={fieldState.invalid}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
