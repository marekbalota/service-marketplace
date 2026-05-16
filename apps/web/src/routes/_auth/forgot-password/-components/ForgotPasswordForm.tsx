import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { authClient } from '#/auth'
import { env } from '#/env'
import { useAppTheme } from '#/lib/theme'
import { formatCountdown } from '#/lib/format'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

const forgotPasswordSchema = z.object({
  email: z.email('Please enter a valid email'),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm({ defaultEmail }: { defaultEmail?: string }) {
  const [confirmed, setConfirmed] = useState(false)
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaVisible, setCaptchaVisible] = useState(false)
  const turnstileRef = useRef<TurnstileInstance | null>(null)
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
      setCaptchaVisible(true)
      turnstileRef.current?.reset()
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
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            If an account with that email exists, you'll receive a reset link shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>Enter your email to receive a reset link</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e)
          }}
          className="space-y-6"
        >
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                <Input
                  {...field}
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <FieldError errors={[form.formState.errors.root]} />
          <div className={captchaVisible ? undefined : '!hidden'}>
            <Turnstile
              ref={turnstileRef}
              siteKey={env.turnstileSiteKey}
              onSuccess={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              onBeforeInteractive={() => setCaptchaVisible(true)}
              options={{ retry: 'auto', refreshExpired: 'auto', theme, size: 'flexible' }}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!captchaToken || form.formState.isSubmitting || rateLimitSeconds > 0}
          >
            {rateLimitSeconds > 0
              ? `Try again in ${formatCountdown(rateLimitSeconds)}`
              : form.formState.isSubmitting
                ? 'Sending…'
                : 'Send reset link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
