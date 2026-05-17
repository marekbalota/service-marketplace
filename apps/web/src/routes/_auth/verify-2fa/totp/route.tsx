import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '#/components/ui/input-otp'

export const Route = createFileRoute('/_auth/verify-2fa/totp')({
  component: TotpChallengePage,
})

function TotpChallengePage() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()
  const [code, setCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    const { error } = await authClient.twoFactor.verifyTotp({ code, trustDevice: rememberDevice })
    setLoading(false)
    if (error) {
      setError(error.message ?? 'Invalid code')
      return
    }
    await queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
    void navigate({ to: (redirect?.startsWith('/') ? redirect : '/') as '/' })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Check your authentication app</CardTitle>
        <CardDescription>Enter the six-digit code from your authenticator app below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="totp-remember"
            checked={rememberDevice}
            onCheckedChange={(c) => setRememberDevice(c === true)}
          />
          <Label htmlFor="totp-remember" className="cursor-pointer">
            Remember this browser for 30 days
          </Label>
        </div>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <Button className="w-full" onClick={handleSubmit} disabled={code.length !== 6 || loading}>
          {loading ? 'Verifying…' : 'Verify'}
        </Button>
        <div className="text-center">
          <Link
            to="/verify-2fa"
            search={redirect ? { redirect } : {}}
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Try another way
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
