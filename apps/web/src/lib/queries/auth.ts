import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { useCurrentUser, currentUserQueryOptions } from '#/lib/queries/users'
import { ApiError } from '#/lib/api-error'

export function useStopImpersonating(options?: { onSuccess?: () => void }) {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.admin.stopImpersonating()
      if (error) throw new ApiError(error.message ?? 'Failed to stop impersonation')
    },
    onSuccess: async () => {
      const userId = user?.userId
      void queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      if (userId) {
        await navigate({ to: '/admin/users/$userId', params: { userId } })
      } else {
        await navigate({ to: '/' })
      }
      router.invalidate()
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
