import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useLocale } from '#/lib/useLocale'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { useCurrentUser, currentUserQueryOptions } from '#/lib/queries/users'
import { ApiError } from '#/lib/api-error'

export function useStopImpersonating(options?: { onSuccess?: () => void }) {
  const locale = useLocale()
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
        await navigate({ to: '/$locale/admin/users/$userId', params: { locale, userId } })
      } else {
        await navigate({ to: '/$locale/posts', params: { locale } })
      }
      router.invalidate()
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
