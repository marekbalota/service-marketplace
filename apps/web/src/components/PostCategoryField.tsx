import { useTranslation } from 'react-i18next'
import { Controller, type Control, type FieldValues } from 'react-hook-form'
import { Tag } from 'lucide-react'
import { FieldIconHeader } from '#/components/FieldIconHeader'
import { MultiSelect } from '#/components/ui/multi-select'
import { Field, FieldError } from '#/components/ui/field'

interface Category {
  categoryId: string
  name: string
}

interface PostCategoryFieldProps<T extends FieldValues> {
  control: Control<T, any>
  categories: Category[]
}

export function PostCategoryField<T extends FieldValues>({
  control: controlProp,
  categories,
}: PostCategoryFieldProps<T>) {
  const { t } = useTranslation()
  const control = controlProp as Control<FieldValues, any>

  return (
    <Controller
      control={control}
      name="categoryIds"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldIconHeader
            icon={Tag}
            iconBgClassName="bg-green-100 dark:bg-green-500/20"
            iconClassName="text-green-600 dark:text-green-300"
            label={t('createPost.categories')}
          />
          <p className="text-sm text-muted-foreground">{t('createPost.categoryHint')}</p>
          <MultiSelect
            options={categories.map((c) => ({ value: c.categoryId, label: c.name }))}
            value={field.value}
            onValueChange={(v) => {
              field.onChange(v)
              field.onBlur()
            }}
            placeholder={t('createPost.categories')}
            searchPlaceholder={t('createPost.searchCategories')}
            searchable
            displayMode="tags"
            className="h-11"
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
