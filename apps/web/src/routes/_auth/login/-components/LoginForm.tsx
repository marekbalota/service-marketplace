import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { Turnstile } from '@marsidev/react-turnstile'
import { authClient } from '#/auth'
import { parseAuthErrorBody } from '#/lib/api-error'
import { handleBanError } from '#/lib/ban-handler'
import { formatCountdown } from '#/lib/format'
import { queryClient } from '#/router'
import { env } from '#/env'
import { useAppTheme } from '#/lib/theme'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { Label } from '#/components/ui/label'
import { currentUserQueryOptions } from '#/lib/queries/users'

const loginSchema = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm({ redirect }: { redirect?: string }) {
  const navigate = useNavigate()
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [challengeVisible, setChallengeVisible] = useState(false)
  const theme = useAppTheme()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
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

  const watchedEmail = form.watch('email')
  const isValidEmail = z.email().safeParse(watchedEmail).success

  const onSubmit: SubmitHandler<LoginValues> = async (values) => {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
      fetchOptions: {
        headers: { 'x-captcha-response': captchaToken! },
        onError: (ctx) => {
          if (ctx.response.status === 429) {
            const retryAfter = parseInt(ctx.response.headers.get('X-Retry-After') ?? '300', 10)
            setRateLimitSeconds(retryAfter)
          }
        },
      },
    })
    if (!error) {
      void queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      void navigate({ to: (redirect?.startsWith('/') ? redirect : '/') as '/' })
      return
    }
    if (handleBanError(error)) return
    if (error.status === 429) return
    if (error.status === 403) {
      const body = parseAuthErrorBody(error)
      if (body?.code === 'CAPTCHA_VERIFICATION_FAILED') {
        setCaptchaToken(null)
        form.setError('root', { message: (body.message as string) ?? error.message })
        return
      }
      void navigate({ to: '/verify-email', search: { email: values.email } })
      return
    }
    setCaptchaToken(null)
    form.setError('root', { message: error.message })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                {...field}
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input
                {...field}
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      <div className="flex items-center justify-between">
        <Controller
          name="rememberMe"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="login-remember-me"
                className="cursor-pointer"
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked)
                  field.onBlur()
                }}
              />
              <Label htmlFor="login-remember-me" className="cursor-pointer">
                Remember me
              </Label>
            </div>
          )}
        />
        <Link
          to="/forgot-password"
          search={isValidEmail ? { email: watchedEmail } : {}}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Forgot your password?
        </Link>
      </div>
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
          ? `Try again in ${formatCountdown(rateLimitSeconds)}`
          : form.formState.isSubmitting
            ? 'Signing in…'
            : 'Log in'}
      </Button>
    </form>
  )
}
