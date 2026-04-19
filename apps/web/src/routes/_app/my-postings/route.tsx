import { Suspense } from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { PostCardSkeleton } from '#/components/PostCardSkeleton'
import { EmptyState } from '#/components/EmptyState'
import { PageHeader } from '#/components/PageHeader'
import { useActiveUser } from '#/contexts/ActiveUserContext'
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
  beforeLoad: async ({ context : { user } }) => {
    if (!user) throw redirect({ to: '/login' })
  },
  component: MyPostingsPage,
})

function PostsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <PostCardSkeleton key={i} />
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
      <EmptyState message="You haven't created any postings yet.">
        <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
          <Plus className="size-4" />
          Create your first posting
        </Link>
      </EmptyState>
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
  const { activeProfile } = useActiveUser()
  const { page = 1 } = Route.useSearch()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="My Postings"
        description="Manage your service offerings"
        action={
          <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
            <Plus className="size-4" />
            Create Posting
          </Link>
        }
      />

      {activeProfile ? (
        <Suspense fallback={<PostsSkeleton />}>
          <PostsGrid profileId={activeProfile.userProfileId} page={page} />
        </Suspense>
      ) : (
        <EmptyState message="No profile found." />
      )}
    </main>
  )
}
