import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
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
  validateSearch: z.object({ redirect: z.string().optional(), email: z.string().optional() }),
  component: EmailChallengePage,
})

function EmailChallengePage() {
  const navigate = useNavigate()
  const { redirect, email } = Route.useSearch()
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sentAt = sessionStorage.getItem(SENT_AT_KEY)
    if (sentAt) {
      const elapsed = Math.floor((Date.now() - parseInt(sentAt)) / 1000)
      const remaining = COOLDOWN_SECONDS - elapsed
      if (remaining > 0) {
        setCodeSent(true)
        setResendCooldown(remaining)
        setLoading(false)
        return
      }
    }
    void handleSend()
  }, [])

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

  async function handleSend() {
    setError(null)
    setLoading(true)
    const { error } = await authClient.twoFactor.sendOtp()
    setLoading(false)
    if (error) {
      setError(error.message ?? 'Failed to send code')
      return
    }
    sessionStorage.setItem(SENT_AT_KEY, Date.now().toString())
    setCodeSent(true)
    setResendCooldown(COOLDOWN_SECONDS)
  }

  async function handleVerify() {
    setError(null)
    setLoading(true)
    const { error } = await authClient.twoFactor.verifyOtp({ code, trustDevice: rememberDevice })
    setLoading(false)
    if (error) {
      setError(error.message ?? 'Invalid code')
      return
    }
    sessionStorage.removeItem(SENT_AT_KEY)
    await queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
    void navigate({ to: (redirect?.startsWith('/') ? redirect : '/') as '/' })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>We'll send a six-digit code to your email address.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            containerClassName="gap-2"
            disabled={!codeSent}
            onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6 && !loading) handleVerify() }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPGroup key={i}>
                <InputOTPSlot index={i} className="size-12 text-base" />
              </InputOTPGroup>
            ))}
          </InputOTP>
        </div>
        <div className="text-center text-sm text-muted-foreground">
          {loading && !codeSent ? (
            'Sending code…'
          ) : !codeSent ? (
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={handleSend}
              disabled={loading}
            >
              Send code
            </button>
          ) : resendCooldown > 0 ? (
            `Resend in ${formatCountdown(resendCooldown)}`
          ) : (
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={handleSend}
              disabled={loading}
            >
              Resend code
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="email-remember"
            checked={rememberDevice}
            onCheckedChange={(c) => setRememberDevice(c === true)}
          />
          <Label htmlFor="email-remember" className="cursor-pointer">
            Remember this browser for 30 days
          </Label>
        </div>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <Button className="w-full" onClick={handleVerify} disabled={!codeSent || code.length !== 6 || loading}>
          {loading && codeSent ? 'Verifying…' : 'Verify'}
        </Button>
        <div className="text-center">
          <Link
            to="/verify-2fa"
            search={{ redirect, email }}
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Try another way
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
