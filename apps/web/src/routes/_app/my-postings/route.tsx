import { Suspense } from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { useActiveProfile, profilesQueryOptions } from '#/contexts/ActiveProfileContext'
import { Skeleton } from '#/components/ui/skeleton'
import { authClient } from '#/auth'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'
import { buildPageNumbers } from '#/routes/_app/posts/index'

const PAGE_SIZE = 12

const searchSchema = z.object({
  page: z.number().int().positive().optional().catch(undefined),
})

export function myPostingsQueryOptions(profileId: string, page: number) {
  return queryOptions({
    queryKey: ['profiles', profileId, 'posts', { page }],
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).posts.get({
        query: {
          offset: (page - 1) * PAGE_SIZE,
          size:   PAGE_SIZE,
        },
      })
      if (error) throw error
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export const Route = createFileRoute('/_app/my-postings')({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(profilesQueryOptions)
  },
  component: MyPostingsPage,
})

function PostsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  )
}

function PostsGrid({ profileId, page }: { profileId: string; page: number }) {
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(myPostingsQueryOptions(profileId, page))
  const navigate = Route.useNavigate()

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await api.posts({ id: postId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId, 'posts'] })
    },
  })

  const setPage = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }) })

  const posts = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  if (posts.length === 0 && page === 1) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-muted-foreground">You haven't created any postings yet.</p>
        <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
          <Plus className="size-4" />
          Create your first posting
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard
            key={post.postId}
            post={post}
            onDelete={() => deleteMutation.mutate(post.postId)}
            deleteDisabled={deleteMutation.isPending}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(page - 1)}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {buildPageNumbers(page, totalPages).map((item, i) =>
                item === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      isActive={item === page}
                      onClick={() => setPage(item)}
                      className="cursor-pointer"
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(page + 1)}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}

function MyPostingsPage() {
  const { activeProfile } = useActiveProfile()
  const { page = 1 } = Route.useSearch()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">My Postings</h1>
          <p className="mt-1 text-muted-foreground">Manage your service offerings</p>
        </div>
        <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
          <Plus className="size-4" />
          Create Posting
        </Link>
      </div>

      {activeProfile ? (
        <Suspense fallback={<PostsSkeleton />}>
          <PostsGrid profileId={activeProfile.userProfileId} page={page} />
        </Suspense>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No profile found.</p>
        </div>
      )}
    </main>
  )
}
