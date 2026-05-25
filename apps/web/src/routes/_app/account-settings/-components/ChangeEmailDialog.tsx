import { useTranslation } from 'react-i18next'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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

const schema = z.object({
  newEmail: z.email(),
})

type FormValues = z.infer<typeof schema>

export function ChangeEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newEmail: '' },
    mode: 'onTouched',
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  const onSubmit: SubmitHandler<FormValues> = async ({ newEmail }) => {
    const { error } = await authClient.changeEmail({ newEmail })
    if (error) {
      const body = parseAuthErrorBody(error)
      form.setError('root', {
        message: (body?.message as string) ?? error.message ?? t('error.unexpected'),
      })
      return
    }
    handleOpenChange(false)
    toast.success(t('accountSettings.changeEmailDialog.successMessage'))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('accountSettings.changeEmailDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('accountSettings.changeEmailDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="newEmail"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-email">
                    {t('accountSettings.changeEmailDialog.newEmail')}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="new-email"
                    type="email"
                    placeholder={t('accountSettings.changeEmailDialog.newEmailPlaceholder')}
                    autoComplete="email"
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
                ? t('accountSettings.changeEmailDialog.submitting')
                : t('accountSettings.changeEmail')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
