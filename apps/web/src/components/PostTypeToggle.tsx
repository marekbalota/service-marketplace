import { useTranslation } from 'react-i18next'
import { Controller, type Control, type FieldValues } from 'react-hook-form'
import { Field, FieldLabel } from '#/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'

export function PostTypeToggle<T extends FieldValues>({
  control: controlProp,
}: {
  control: Control<T, any>
}) {
  const { t } = useTranslation()
  const control = controlProp as Control<FieldValues, any>
  return (
    <Controller
      control={control}
      name="postType"
      render={({ field }) => (
        <Field>
          <FieldLabel className="text-base font-semibold">{t('createPost.typeLabel')}</FieldLabel>
          <ToggleGroup
            value={field.value ? [field.value] : []}
            onValueChange={(vals) => {
              const v = vals[vals.length - 1]
              if (v) field.onChange(v)
            }}
            className="grid grid-cols-2 overflow-hidden rounded-lg border p-0"
          >
            {(['OFFER', 'REQUEST'] as const).map((type) => (
              <ToggleGroupItem
                key={type}
                value={type}
                className={[
                  'h-11 rounded-none',
                  field.value === type
                    ? 'aria-pressed:bg-primary aria-pressed:text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted',
                  type === 'OFFER' ? 'border-r' : '',
                ].join(' ')}
              >
                {type === 'OFFER' ? t('posts.type.offer') : t('posts.type.request')}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      )}
    />
  )
}
