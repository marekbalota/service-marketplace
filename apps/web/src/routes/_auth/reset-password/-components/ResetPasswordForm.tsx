import { useTranslation } from 'react-i18next'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import i18n from '#/lib/i18n'
import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { authClient } from '#/auth'
import { Button, buttonVariants } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Card, CardContent, CardHeader } from '#/components/ui/card'

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.newPassword !== d.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: i18n.t('validation.passwordsMismatch'),
        path: ['confirmPassword'],
      })
    }
  })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

interface ResetPasswordFormProps {
  token?: string
  urlError?: string
}

export function ResetPasswordForm({ token, urlError }: ResetPasswordFormProps) {
  const { t } = useTranslation()
  const [succeeded, setSucceeded] = useState(false)
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  })

  const onSubmit: SubmitHandler<ResetPasswordValues> = async (values) => {
    const { error } = await authClient.resetPassword({
      newPassword: values.newPassword,
      token: token!,
    })
    if (error) {
      form.setError('root', { message: error.message ?? t('error.unexpected') })
      return
    }
    setSucceeded(true)
  }

  if (!token || urlError) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-heading text-2xl font-medium">
            {t('auth.resetPassword.invalidTitle')}
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.resetPassword.invalidMessage')}
          </p>
          <Link to="/forgot-password" className={buttonVariants({ className: 'w-full' })}>
            {t('auth.resetPassword.requestNew')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (succeeded) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
          </div>
          <h2 className="font-heading text-2xl font-medium">
            {t('auth.resetPassword.successTitle')}
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.resetPassword.successMessage')}
          </p>
          <Link to="/login" className={buttonVariants({ className: 'w-full' })}>
            {t('auth.resetPassword.signIn')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <h2 className="font-heading text-2xl font-medium">{t('auth.resetPassword.title')}</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Controller
            name="newPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="new-password">
                  {t('auth.resetPassword.newPassword')}
                </FieldLabel>
                <Input
                  {...field}
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
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
                  {t('auth.resetPassword.confirmPassword')}
                </FieldLabel>
                <Input
                  {...field}
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <FieldError errors={[form.formState.errors.root]} />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? t('auth.resetPassword.submitting')
              : t('auth.resetPassword.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
