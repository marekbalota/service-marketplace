import { Controller, useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import { authClient } from "#/auth"
import { handleBanError } from '#/lib/ban-handler'
import { queryClient } from '#/router'
import { Button } from "#/components/ui/button"
import { Checkbox } from "#/components/ui/checkbox"
import { Input } from "#/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field"
import { currentUserQueryOptions } from "#/lib/queries/users"

const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
})

type LoginValues = z.infer<typeof loginSchema>

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function LoginForm({ redirect }: { redirect?: string }) {
  const navigate = useNavigate()
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
    mode: "onTouched",
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

  const onSubmit: SubmitHandler<LoginValues> = async (values) => {
    await authClient.signIn.email(
      { email: values.email, password: values.password, rememberMe: values.rememberMe },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
          void navigate({ to: (redirect?.startsWith('/') ? redirect : '/') as '/' })
        },
        onError: (ctx) => {
          if (handleBanError(ctx.error)) return
          if (ctx.error.status === 429) return
          if (ctx.error.status === 403) {
            void navigate({ to: "/verify-email", search: { email: values.email } })
            return
          }
          form.setError("root", { message: ctx.error.message })
        },
        fetchOptions: {
          onError: async (ctx: { response: Response }) => {
            if (ctx.response.status === 429) {
              const retryAfter = parseInt(ctx.response.headers.get("X-Retry-After") ?? "300", 10)
              setRateLimitSeconds(retryAfter)
            }
          },
        },
      }
    )
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
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked)
                  field.onBlur()
                }}
              />
              <label htmlFor="login-remember-me" className="text-sm cursor-pointer">
                Remember me
              </label>
            </div>
          )}
        />
        <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
          Forgot your password?
        </Link>
      </div>
      <FieldError errors={[form.formState.errors.root]} />
      {rateLimitSeconds > 0 && (
        <p className="text-center text-sm text-destructive">
          Too many login attempts — try again in {formatCountdown(rateLimitSeconds)}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting || rateLimitSeconds > 0}
      >
        {form.formState.isSubmitting ? "Signing in…" : "Log in"}
      </Button>
    </form>
  )
}
