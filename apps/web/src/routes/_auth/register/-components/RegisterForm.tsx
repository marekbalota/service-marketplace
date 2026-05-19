import { useState, useRef } from 'react'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { authClient } from '#/auth'
import { parseAuthErrorBody } from '#/lib/api-error'
import { env } from '#/env'
import { useAppTheme } from '#/lib/theme'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const navigate = useNavigate()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaVisible, setCaptchaVisible] = useState(false)
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const theme = useAppTheme()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
    mode: 'onTouched',
  })

  const onSubmit: SubmitHandler<RegisterValues> = async (values) => {
    const { error } = await authClient.signUp.email(values, {
      headers: { 'x-captcha-response': captchaToken! },
    })
    if (!error) {
      void navigate({ to: '/verify-email', search: { email: values.email } })
      return
    }
    if (error.status === 403) {
      const body = parseAuthErrorBody(error)
      if (body?.code === 'VERIFICATION_FAILED') {
        setCaptchaToken(null)
        setCaptchaVisible(true)
        turnstileRef.current?.reset()
        const msg = typeof body.message === 'string' ? body.message : error.message
        form.setError('root', { message: msg })
        return
      }
    }
    setCaptchaToken(null)
    setCaptchaVisible(true)
    turnstileRef.current?.reset()
    form.setError('root', { message: error.message })
  }

  return (
    <form
      onSubmit={(e) => {
        void form.handleSubmit(onSubmit)(e)
      }}
      className="space-y-6"
    >
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-name">Full Name</FieldLabel>
              <Input
                {...field}
                id="register-name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-email">Email</FieldLabel>
              <Input
                {...field}
                id="register-email"
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
              <FieldLabel htmlFor="register-password">Password</FieldLabel>
              <Input
                {...field}
                id="register-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
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
        disabled={!captchaToken || form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? 'Registering…' : 'Register'}
      </Button>
    </form>
  )
}
