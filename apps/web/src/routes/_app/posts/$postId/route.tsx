import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { BackButton } from '#/components/BackButton'
import { postDetailQueryOptions } from '#/lib/queries/posts'
import { PostInfoCard } from './-components/PostInfoCard'
import { PostSidebarCard } from './-components/PostSidebarCard'
import { PostReviewsCard } from './-components/PostReviewsCard'

export const Route = createFileRoute('/_app/posts/$postId')({
  loader: async ({ context: { queryClient }, params: { postId } }) => {
    await queryClient.ensureQueryData(postDetailQueryOptions(postId))
  },
  pendingComponent: PostDetailSkeleton,
  component: PostDetailPage,
})

function PostDetailSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="mb-4 h-9 w-24" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-3">
            <Skeleton className="h-7 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-28" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
        <div className="space-y-4 lg:col-start-3 lg:row-start-1 lg:row-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-5 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card className="lg:col-span-2 lg:row-start-2">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function PostDetailPage() {
  const { postId } = Route.useParams()
  const router = useRouter()

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <BackButton onClick={() => router.history.back()} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PostInfoCard postId={postId} />
        <PostSidebarCard postId={postId} />
        <PostReviewsCard postId={postId} />
      </div>
    </main>
  )
}
