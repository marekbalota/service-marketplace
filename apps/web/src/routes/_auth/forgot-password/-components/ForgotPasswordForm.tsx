import { useTranslation } from 'react-i18next'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'
import { authClient } from '#/auth'
import { env } from '#/env'
import { useAppTheme } from '#/lib/theme'
import { formatCountdown } from '#/lib/format'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

const forgotPasswordSchema = z.object({
  email: z.email(),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm({ defaultEmail }: { defaultEmail?: string }) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [challengeVisible, setChallengeVisible] = useState(false)
  const theme = useAppTheme()
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: defaultEmail ?? '' },
    mode: 'onTouched',
  })

  useEffect(() => {
    if (rateLimitSeconds <= 0) return
    const id = setInterval(() => {
      setRateLimitSeconds((s) => {
        if (s <= 1) {
          clearInterval(id)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [rateLimitSeconds])

  const onSubmit: SubmitHandler<ForgotPasswordValues> = async (values) => {
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      fetchOptions: {
        headers: { 'x-captcha-response': captchaToken! },
        onError: (ctx) => {
          if (ctx.response.status === 429) {
            const retryAfter = parseInt(ctx.response.headers.get('X-Retry-After') ?? '3600', 10)
            setRateLimitSeconds(retryAfter)
          }
        },
      },
    })
    if (error?.status === 429) return
    if (error) {
      setCaptchaToken(null)
      form.setError('root', { message: error.message })
      return
    }
    setConfirmed(true)
  }

  if (confirmed) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-300" />
          </div>
          <CardTitle className="text-2xl">{t('auth.forgotPassword.successTitle')}</CardTitle>
          <CardDescription>
            {t('auth.forgotPassword.successMessage')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.forgotPassword.title')}</CardTitle>
        <CardDescription>{t('auth.forgotPassword.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="forgot-email">{t('auth.forgotPassword.email')}</FieldLabel>
                <Input
                  {...field}
                  id="forgot-email"
                  type="email"
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <div className={challengeVisible ? undefined : '!hidden'}>
            <Turnstile
              siteKey={env.turnstileSiteKey}
              onSuccess={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              onBeforeInteractive={() => setChallengeVisible(true)}
              options={{ retry: 'auto', refreshExpired: 'auto', theme, size: 'flexible' }}
            />
          </div>
          <FieldError errors={[form.formState.errors.root]} />
          <Button
            type="submit"
            className="w-full"
            disabled={!captchaToken || form.formState.isSubmitting || rateLimitSeconds > 0}
          >
            {rateLimitSeconds > 0
              ? t('auth.forgotPassword.tryAgain', { time: formatCountdown(rateLimitSeconds) })
              : form.formState.isSubmitting
                ? t('auth.forgotPassword.submitting')
                : t('auth.forgotPassword.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
