import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { useCurrentUser } from '#/lib/queries/users'
import { authClient } from '#/auth'

export function ImpersonationBanner() {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const stopMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.admin.stopImpersonating();
      if (error) throw new Error(error.message ?? 'Failed to stop impersonation');
    },
    onSuccess: () => {
      const targetUserId = user!.userId
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
      navigate({ to: '/admin/users/$userId', params: { userId: targetUserId } })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

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
