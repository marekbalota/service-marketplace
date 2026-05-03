import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { useCurrentUser, currentUserQueryOptions } from '#/lib/queries/users'

export function useStopImpersonating(options?: { onSuccess?: () => void }) {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.admin.stopImpersonating()
      if (error) throw new Error(error.message ?? 'Failed to stop impersonation')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      void navigate({ to: '/admin/users/$userId', params: { userId: user!.userId } })
      router.invalidate()
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
