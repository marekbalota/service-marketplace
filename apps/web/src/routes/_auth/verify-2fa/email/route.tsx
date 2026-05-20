import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { authClient } from '#/auth'
import { formatCountdown } from '#/lib/format'
import { queryClient } from '#/router'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '#/components/ui/input-otp'

const SENT_AT_KEY = 'verify-2fa-email-sent-at'
const COOLDOWN_SECONDS = 60

export const Route = createFileRoute('/_auth/verify-2fa/email')({
  validateSearch: z.object({
    redirect: z.string().optional(),
    email: z.string().optional(),
    twoFactorMethods: z.array(z.enum(['email', 'totp'])).optional(),
  }),
  beforeLoad: ({ search }) => {
    if (search.twoFactorMethods && !search.twoFactorMethods.includes('email')) {
      throw redirect({ to: '/verify-2fa', search })
    }
  },
  component: EmailChallengePage,
})

function EmailChallengePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { redirect, email, twoFactorMethods } = Route.useSearch()
  const [code, setCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(id)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  const sendCode = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.twoFactor.sendEmailOtp()
      if (error) throw new Error(error.message ?? t('twoFactor.verifyEmail.errorSend'))
    },
    onSuccess: () => {
      sessionStorage.setItem(SENT_AT_KEY, Date.now().toString())
      setResendCooldown(COOLDOWN_SECONDS)
      setIsSending(false)
    },
    onError: () => setIsSending(false),
  })

  const verify = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.twoFactor.verifyEmailOtp({
        code,
        trustDevice: rememberDevice,
      })
      if (error) throw new Error(error.message ?? t('twoFactor.verifyEmail.errorInvalidCode'))
    },
    onSuccess: async () => {
      sessionStorage.removeItem(SENT_AT_KEY)
      await queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      void navigate({ to: (redirect?.startsWith('/') ? redirect : '/') as '/', replace: true })
    },
  })

  const hasSentRef = useRef(false)
  useEffect(() => {
    const sentAt = sessionStorage.getItem(SENT_AT_KEY)
    if (sentAt) {
      const elapsed = Math.floor((Date.now() - parseInt(sentAt)) / 1000)
      const remaining = COOLDOWN_SECONDS - elapsed
      if (remaining > 0) {
        setResendCooldown(remaining)
        return
      }
    }
    if (hasSentRef.current) return
    hasSentRef.current = true
    sendCode.mutate()
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('twoFactor.verifyEmail.title')}</CardTitle>
        <CardDescription>{t('twoFactor.verifyEmail.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            containerClassName="gap-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.length === 6 && !verify.isPending) verify.mutate()
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPGroup key={i}>
                <InputOTPSlot index={i} className="size-12 text-base" />
              </InputOTPGroup>
            ))}
          </InputOTP>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={() => {
              setIsSending(true)
              sendCode.mutate()
            }}
            disabled={isSending || resendCooldown > 0}
          >
            {isSending
              ? t('twoFactor.common.sending')
              : resendCooldown > 0
                ? t('twoFactor.common.resendIn', { countdown: formatCountdown(resendCooldown) })
                : t('twoFactor.common.resendCode')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="email-remember"
            className="cursor-pointer"
            checked={rememberDevice}
            onCheckedChange={(c) => setRememberDevice(c === true)}
          />
          <Label htmlFor="email-remember" className="cursor-pointer">
            {t('twoFactor.common.rememberBrowser')}
          </Label>
        </div>
        {(sendCode.error || verify.error) && (
          <p className="text-sm text-destructive text-center">
            {(sendCode.error ?? verify.error)?.message}
          </p>
        )}
        <Button
          className="w-full"
          onClick={() => verify.mutate()}
          disabled={code.length !== 6 || verify.isPending}
        >
          {verify.isPending ? t('twoFactor.common.verifying') : t('twoFactor.common.verify')}
        </Button>
        <div className="text-center">
          <Link
            to="/verify-2fa"
            search={{ redirect, email, twoFactorMethods }}
            replace
            className="font-medium hover:text-foreground text-muted-foreground"
          >
            {t('twoFactor.common.tryAnotherWay')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
