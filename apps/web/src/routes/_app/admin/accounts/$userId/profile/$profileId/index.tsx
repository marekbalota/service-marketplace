import { createFileRoute } from '@tanstack/react-router';
import { Suspense, useState } from 'react';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { keepPreviousData } from '@tanstack/react-query';
import { api } from '#/api';
import { BackButton } from '#/components/BackButton';
import { EmptyState } from '#/components/EmptyState';
import { PostCard } from '#/components/PostCard';
import { PostCardSkeleton } from '#/components/PostCardSkeleton';
import { Button } from '#/components/ui/button';
import { Card, CardContent } from '#/components/ui/card';
import { Skeleton } from '#/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination';
import { hasPermissions, Permissions } from '@marketplace/shared';
import { useActiveUser } from '#/contexts/ActiveUserContext';
import { buildPageNumbers } from '#/routes/_app/posts/index';

const PAGE_SIZE = 12;

const searchSchema = z.object({
  page: z.number().int().positive().optional().catch(undefined),
});

export const profileDetailQueryOptions = (profileId: string) =>
  queryOptions({
    queryKey: ['profiles', profileId],
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).get();
      if (error) throw error;
      return data!;
    },
  });

export const profilePostsQueryOptions = (profileId: string, page: number) =>
  queryOptions({
    queryKey: ['profiles', profileId, 'posts', { page }],
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).posts.get({
        query: { offset: (page - 1) * PAGE_SIZE, size: PAGE_SIZE },
      });
      if (error) throw error;
      return data!;
    },
    placeholderData: keepPreviousData,
  });

export const Route = createFileRoute(
  '/_app/admin/accounts/$userId/profile/$profileId/',
)({
  validateSearch: searchSchema,
  component: ProfileDetailPage,
});

type Post = NonNullable<Awaited<ReturnType<typeof api.profiles.prototype.posts.get>>['data']>['items'][number];

function DeletePostDialog({
  open,
  postTitle,
  onConfirm,
  onClose,
}: {
  open: boolean;
  postTitle: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete post?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove &quot;{postTitle}&quot;. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => {
              setIsPending(true);
              try { await onConfirm(); } finally { setIsPending(false); }
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ProfilePostsContent({
  profileId,
  userId,
  canDeletePost,
}: {
  profileId: string;
  userId: string;
  canDeletePost: boolean;
}) {
  const navigate = Route.useNavigate();
  const { page = 1 } = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: profile } = useSuspenseQuery(profileDetailQueryOptions(profileId));
  const { data: postsData } = useSuspenseQuery(profilePostsQueryOptions(profileId, page));

  const posts = postsData?.items ?? [];
  const totalPages = postsData?.totalPages ?? 1;

  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await api.admin.posts({ id: deleteTarget.postId }).delete({});
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['profiles', profileId, 'posts'] });
    setDeleteTarget(null);
  };

  return (
    <>
      {/* Profile card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="size-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md shrink-0">
              <UserIcon className="size-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold mb-0.5">{profile.name}</h1>
              <p className="text-sm text-muted-foreground mb-1">{profile.email}</p>
              {profile.bio && <p className="text-sm text-muted-foreground mb-2">{profile.bio}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                {profile.phoneNumber && <span>📞 {profile.phoneNumber}</span>}
                {profile.fax && <span>📠 {profile.fax}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Posts by {profile.name}</h2>
        <p className="text-muted-foreground text-sm">
          {postsData?.total ?? 0} {postsData?.total === 1 ? 'post' : 'posts'} found
        </p>
      </div>

      {posts.length === 0 ? (
        <EmptyState message="No posts found for this profile." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              showFavouriteButton={false}
              onDelete={canDeletePost ? () => setDeleteTarget(post) : undefined}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
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

      <DeletePostDialog
        open={!!deleteTarget}
        postTitle={deleteTarget?.postTitle ?? ''}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}

function ProfileDetailSkeleton() {
  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Skeleton className="size-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
      </div>
    </>
  );
}

function ProfileDetailPage() {
  const { userId, profileId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { user } = useActiveUser();
  const permissions = user?.role?.permissions ?? [];
  const canDeletePost = hasPermissions(permissions, [Permissions.PostsDeleteAny]);

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton
        onClick={() => navigate({ to: '/admin/accounts/$userId', params: { userId } })}
        label="Back to User"
      />
      <Suspense fallback={<ProfileDetailSkeleton />}>
        <ProfilePostsContent
          profileId={profileId}
          userId={userId}
          canDeletePost={canDeletePost}
        />
      </Suspense>
    </main>
  );
}
