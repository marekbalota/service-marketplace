import { Controller, type Control } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Field, FieldGroup, FieldLabel, FieldError } from '#/components/ui/field'
import { type ProfileFormValues } from './profileSchema'

export function ProfileFields({ control }: { control: Control<ProfileFormValues> }) {
  const { t } = useTranslation()
  return (
    <FieldGroup>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('profiles.name')} *</FieldLabel>
              <Input
                placeholder={t('profiles.namePlaceholder')}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('profiles.emailLabel')} *</FieldLabel>
              <Input
                type="email"
                placeholder={t('profiles.emailPlaceholder')}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          control={control}
          name="phoneNumber"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('profiles.phoneNumber')}</FieldLabel>
              <Input
                type="tel"
                placeholder={t('profiles.phoneNumberPlaceholder')}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="fax"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>{t('profiles.fax')}</FieldLabel>
              <Input
                type="tel"
                placeholder={t('profiles.faxPlaceholder')}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
      <Controller
        control={control}
        name="bio"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t('profiles.bio')}</FieldLabel>
            <Textarea
              placeholder={t('profiles.bioPlaceholder')}
              rows={3}
              className="resize-none"
              aria-invalid={fieldState.invalid}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </FieldGroup>
  )
}
