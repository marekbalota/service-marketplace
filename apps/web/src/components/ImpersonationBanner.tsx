import { Button } from '#/components/ui/button'
import { useCurrentUser } from '#/lib/queries/users'
import { useStopImpersonating } from '#/lib/queries/auth'

export function ImpersonationBanner() {
  const { data: user } = useCurrentUser()
  const stopMutation = useStopImpersonating()

  if (!user?.impersonatedBy) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-900/30 flex items-center justify-between">
      <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
        Impersonating {user.name}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-800"
        disabled={stopMutation.isPending}
        onClick={() => stopMutation.mutate()}
      >
        Exit Impersonation
      </Button>
    </div>
  )
}
