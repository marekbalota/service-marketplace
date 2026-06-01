import { useTranslation } from 'react-i18next'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import i18next from 'i18next'
import { authClient } from '#/auth'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { parseAuthErrorBody } from '#/lib/api-error'

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.newPassword !== d.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18next.t('validation.passwordsMismatch'),
        path: ['confirmPassword'],
      })
    }
  })

type FormValues = z.infer<typeof schema>

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  const onSubmit: SubmitHandler<FormValues> = async ({ currentPassword, newPassword }) => {
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    if (error) {
      const body = parseAuthErrorBody(error)
      form.setError('root', {
        message: (body?.message as string) ?? error.message ?? t('error.unexpected'),
      })
      return
    }
    handleOpenChange(false)
    toast.success(t('accountSettings.changePasswordDialog.successMessage'))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('accountSettings.changePasswordDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('accountSettings.changePasswordDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="currentPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="current-password">
                    {t('accountSettings.changePasswordDialog.currentPassword')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="newPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-password">
                    {t('accountSettings.changePasswordDialog.newPassword')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="confirm-password">
                    {t('accountSettings.changePasswordDialog.confirmPassword')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
          <FieldError errors={[form.formState.errors.root]} />
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid}>
              {form.formState.isSubmitting
                ? t('accountSettings.changePasswordDialog.submitting')
                : t('accountSettings.changePassword')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
