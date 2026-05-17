import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { authClient } from '#/auth'
import { queryClient } from '#/router'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export const Route = createFileRoute('/_auth/verify-2fa/backup')({
  validateSearch: z.object({ redirect: z.string().optional(), email: z.string().optional() }),
  component: BackupChallengePage,
})

function BackupChallengePage() {
  const navigate = useNavigate()
  const { redirect, email } = Route.useSearch()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    const { error } = await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
    setLoading(false)
    if (error) {
      setError(error.message ?? 'Invalid backup code')
      return
    }
    await queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
    void navigate({ to: (redirect?.startsWith('/') ? redirect : '/') as '/' })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Use a backup code</CardTitle>
        <CardDescription>Each backup code can only be used once.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="backup-code-input">Backup code</Label>
          <Input
            id="backup-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono"
            placeholder="xxxxxxxx"
            autoComplete="off"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={handleSubmit} disabled={!code || loading}>
          {loading ? 'Verifying…' : 'Verify'}
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
