import { Heart } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { api } from '#/api'

export function FavouriteButton({
  postId,
  initialIsFavourite,
  onToggle,
  disabled,
}: {
  postId: string
  initialIsFavourite?: boolean
  onToggle?: () => void
  disabled?: boolean
}) {
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()
  const isAuthenticated = user != null
  const profileId = activeProfile?.userProfileId

  const { data: favouritesList } = useQuery({
    queryKey: ['favourites', profileId],
    queryFn: async () => {
      const { data, error } = await api.favourites.get({ query: { profileId: profileId! } })
      if (error) throw error
      return data
    },
    enabled: isAuthenticated && !!profileId && initialIsFavourite === undefined,
  })

  const isFavourite = initialIsFavourite ?? (favouritesList?.items.some((f: { postId: string }) => f.postId === postId) ?? false)

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.favourites({ postId }).post({ profileId: profileId! })
      if (error) {
        console.error('Add favourite error:', error, 'Status:', response?.status)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites', profileId] })
      onToggle?.()
    },
    onError: (error) => {
      console.error('Add favourite mutation error:', error)
    },
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error, response } = await api.favourites({ postId }).delete({ profileId: profileId! })
      if (error) {
        console.error('Remove favourite error:', error, 'Status:', response?.status)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites', profileId] })
      onToggle?.()
    },
    onError: (error) => {
      console.error('Remove favourite mutation error:', error)
    },
  })

  const isPending = addMutation.isPending || removeMutation.isPending || disabled

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPending) return

    if (isFavourite) {
      removeMutation.mutate()
    } else {
      addMutation.mutate()
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      onClick={handleClick}
      className={cn(
        'transition-colors',
        isFavourite
          ? 'text-red-500 hover:text-red-600'
          : 'text-muted-foreground hover:text-red-500'
      )}
    >
      <Heart
        className={cn(
          'size-5 transition-all',
          isFavourite && 'fill-red-500 text-red-500'
        )}
      />
    </Button>
  )
}
