import { createFileRoute, useRouter } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, DollarSign, MapPin, User, Heart, MessageSquare, Pencil, Star } from 'lucide-react'
import { api } from '#/api'
import { authClient } from '#/auth'
import { useActiveProfile } from '#/contexts/ActiveProfileContext'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { formatLocation } from '#/lib/format'

export function postDetailQueryOptions(postId: string) {
  return queryOptions({
    queryKey: ['posts', postId],
    queryFn: async () => {
      const { data, error } = await api.posts({ id: postId }).get()
      if (error) throw error
      return data!
    },
  })
}

export const Route = createFileRoute('/_app/posts/$postId')({
  loader: async ({ context: { queryClient }, params: { postId } }) => {
    await queryClient.ensureQueryData(postDetailQueryOptions(postId))
  },
  pendingComponent: PostDetailSkeleton,
  component: PostDetailPage,
})

function PostDetailSkeleton() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <Skeleton className="mb-4 h-9 w-24" />
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-28" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

const RATE_LABELS: Record<string, string> = {
  HOURLY: '/hr',
  DAILY: '/day',
  FIXED: 'fixed',
}

function FavouriteButton({ postId }: { postId: string }) {
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
    enabled: isAuthenticated,
  })

  const isFavourite = checkData?.isFavourite ?? false

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.favourites({ postId }).post()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites', 'check', postId] })
      queryClient.invalidateQueries({ queryKey: ['favourites'] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.favourites({ postId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites', 'check', postId] })
      queryClient.invalidateQueries({ queryKey: ['favourites'] })
    },
  })

  const isPending = addMutation.isPending || removeMutation.isPending

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
          'size-6 transition-all',
          isFavourite && 'fill-red-500 text-red-500'
        )}
      />
    </Button>
  )
}

function PostDetailPage() {
  const { postId } = Route.useParams()
  const { data: post } = useSuspenseQuery(postDetailQueryOptions(postId))
  const { activeProfile } = useActiveProfile()
  const { data: session } = authClient.useSession()
  const router = useRouter()
  const isOwner = activeProfile?.userProfileId === post.authorId
  const isAuthenticated = !!session?.user

  const primaryCategory = post.categories[0]?.name ?? null
  const isOffer = post.postType === 'OFFER'
  const price = post.price ? parseFloat(post.price) : null
  const rateLabel = post.rateType ? RATE_LABELS[post.rateType] : null
  const locationText = post.location ? formatLocation(post.location) : null

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.history.back()} className="mb-4 gap-2">
        <ArrowLeft className="size-4" />
        Back
      </Button>

      <Card className='gap-2'>
        <CardHeader>
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold">{post.postTitle}</h1>
            <div className="flex items-center gap-2">
              {isAuthenticated && !isOwner && (
                <FavouriteButton postId={postId} />
              )}
              {isOwner && (
                <Button variant="outline" size="sm" className="shrink-0 gap-2" disabled>
                  <Pencil className="size-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
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
            {primaryCategory && <Badge variant="secondary">{primaryCategory}</Badge>}
          </div>

          {/* Price */}
          {price !== null && (
            <div className="flex items-center pt-2 gap-1">
              <DollarSign className="size-6 text-price" />
              <span className="text-2xl font-semibold text-price">
                {price}
                {rateLabel && <span className="text-base"> {rateLabel}</span>}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <h2 className="mb-2 text-lg font-medium">Description</h2>
            <p className="text-muted-foreground">{post.description}</p>
          </div>

          <Separator />

          {/* Details grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <User className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Posted by</p>
                <p className="font-medium">{post.authorName}</p>
              </div>
            </div>
            {locationText && (
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{locationText}</p>
                </div>
              </div>
            )}
            {post.rateType && (
              <div className="flex items-center gap-2">
                <DollarSign className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Rate Type</p>
                  <p className="font-medium">{post.rateType.charAt(0) + post.rateType.slice(1).toLowerCase()}</p>
                </div>
              </div>
            )}
            {post.reviewCount > 0 && (
              <div className="flex items-center gap-2">
                <Star className="size-5 fill-star-filled text-star-filled" />
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="font-medium">
                    {post.averageRating!.toFixed(1)} ({post.reviewCount} {post.reviewCount === 1 ? 'review' : 'reviews'})
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Visitor actions */}
          {!isOwner && (
            <>
              <Separator />
              <div className="space-y-3">
                <Button className="w-full gap-2" disabled>
                  <MessageSquare className="size-4" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full gap-2" disabled>
                  <Star className="size-4" />
                  Leave a Review
                </Button>
              </div>
            </>
          )}

          <Separator />

          {/* Reviews */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Reviews ({post.reviewCount})</h2>
            {post.reviews.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {post.reviews.map((review) => (
                  <Card key={review.reviewId}>
                    <CardContent className="pt-6">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <p className="font-medium">{review.reviewerName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn('size-4', star <= review.rating ? 'fill-star-filled text-star-filled' : 'text-star-empty')}
                            />
                          ))}
                        </div>
                      </div>
                      {review.reviewDescription && (
                        <p className="text-muted-foreground">{review.reviewDescription}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
