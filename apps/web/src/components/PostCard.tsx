import { MapPin, User, DollarSign, Heart, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authClient } from '#/auth'
import { api } from '#/api'
import type { api as ApiType } from '#/api'

export type Post = NonNullable<Awaited<ReturnType<typeof ApiType.posts.get>>['data']>['items'][number]

const RATE_LABELS: Record<string, string> = {
  HOURLY: '/hr',
  DAILY: '/day',
  FIXED: 'fixed',
}

type PostCardProps = {
  post: Post
  onDelete?: () => void
  deleteDisabled?: boolean
  isFavourite?: boolean
  onFavouriteToggle?: () => void
  favouriteDisabled?: boolean
  showFavouriteButton?: boolean
}

function FavouriteButton({
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
  const { data: session } = authClient.useSession()
  const isAuthenticated = !!session?.user

  const { data: checkData } = useQuery({
    queryKey: ['favourites', 'check', postId],
    queryFn: async () => {
      const { data, error } = await api.favourites['check']({ postId }).get()
      if (error) throw error
      return data
    },
    enabled: isAuthenticated && initialIsFavourite === undefined,
  })

  const isFavourite = initialIsFavourite ?? checkData?.isFavourite ?? false

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.favourites({ postId }).post()
      if (error) {
        console.error('Add favourite error:', error, 'Status:', response?.status)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites', 'check', postId] })
      queryClient.invalidateQueries({ queryKey: ['favourites'] })
      onToggle?.()
    },
    onError: (error) => {
      console.error('Add favourite mutation error:', error)
    },
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error, response } = await api.favourites({ postId }).delete()
      if (error) {
        console.error('Remove favourite error:', error, 'Status:', response?.status)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites', 'check', postId] })
      queryClient.invalidateQueries({ queryKey: ['favourites'] })
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

export function PostCard({
  post,
  onDelete,
  deleteDisabled,
  isFavourite,
  onFavouriteToggle,
  favouriteDisabled,
  showFavouriteButton = true,
}: PostCardProps) {
  const { data: session } = authClient.useSession()
  const isAuthenticated = !!session?.user
  const isOffer = post.postType === 'OFFER'
  const price = post.price ? parseFloat(post.price) : null
  const rateLabel = post.rateType ? RATE_LABELS[post.rateType] : null

  return (
    <Link to="/posts/$postId" params={{ postId: post.postId }} className="block h-full">
      <Card className="flex h-full cursor-pointer flex-col gap-3 transition-shadow hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="relative pr-10">
            <h3 className="line-clamp-1">{post.postTitle}</h3>
            <div className="absolute right-0 top-0 flex items-center gap-2">
              {onDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={deleteDisabled}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete()
                  }}
                >
                  <Trash2 className="size-5" />
                </Button>
              ) : showFavouriteButton && isAuthenticated ? (
                <FavouriteButton
                  postId={post.postId}
                  initialIsFavourite={isFavourite}
                  onToggle={onFavouriteToggle}
                  disabled={favouriteDisabled}
                />
              ) : null}
            </div>
          </div>
          {/* Badge row spans full card width — capped at 2 lines */}
          <div className="mt-2 flex max-h-14 flex-wrap items-center gap-2 overflow-hidden">
            <Badge
              variant={isOffer ? 'default' : 'outline'}
              className={cn(
                isOffer
                  ? 'bg-offer-bg text-offer-fg hover:bg-offer-bg'
                  : 'border-request-border text-request-fg'
              )}
            >
              {isOffer ? 'Offering' : 'Requesting'}
            </Badge>
            {post.categories.map((c) => (
              <Badge key={c.name} variant="secondary">{c.name}</Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-1">
          <p className="line-clamp-4 text-muted-foreground">{post.description}</p>
          {/* mt-auto pushes footer to bottom, filling any blank space from equal-height rows */}
          <div className="mt-auto flex items-center justify-between pt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <User className="size-4" />
                <span>{post.authorName}</span>
              </div>
              {post.location?.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  <span>{post.location.city}</span>
                </div>
              )}
            </div>
            {price !== null && (
              <div className="flex items-center gap-1">
                <DollarSign className="size-4 text-price" />
                <span className="font-semibold text-price">
                  {price}
                  {rateLabel && <span className="font-normal"> {rateLabel}</span>}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
