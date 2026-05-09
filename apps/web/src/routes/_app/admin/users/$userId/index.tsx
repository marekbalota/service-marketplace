import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Calendar, LogIn, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileAvatar } from '#/components/ProfileAvatar';
import { BackButton } from '#/components/BackButton';
import { PageHeader } from '#/components/PageHeader';
import { EmptyState } from '#/components/EmptyState';
import { Button, buttonVariants } from '#/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { Skeleton } from '#/components/ui/skeleton';
import { userDetailQueryOptions, userProfilesQueryOptions } from './-queries/user';
import { useCurrentUser } from '#/lib/queries/users';
import { Permissions } from '@marketplace/shared';
import { authClient } from '#/auth';

export const Route = createFileRoute('/_app/admin/users/$userId/')({
  loader: ({ context: { queryClient }, params: { userId } }) => {
    void queryClient.prefetchQuery(userDetailQueryOptions(userId))
    void queryClient.prefetchQuery(userProfilesQueryOptions(userId))
  },
  component: UserDetailPage,
});

function UserDetailSkeleton() {
  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Skeleton className="size-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </CardContent>
      </Card>
    </>
  );
}

function UserDetailContent({ userId }: { userId: string }) {
  const { data: user } = useSuspenseQuery(userDetailQueryOptions(userId));
  const { data: profiles = [] } = useSuspenseQuery(userProfilesQueryOptions(userId));
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isImpersonating = !!currentUser?.impersonatedBy;
  const hasImpersonatePermission = !!(
    currentUser?.role?.permissions?.includes(Permissions.AdminUsersImpersonate)
  );
  const canImpersonate = !!(
    !isImpersonating && hasImpersonatePermission && currentUser?.role && user.role &&
    currentUser.role.priority > user.role.priority
  );

  const impersonateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.admin.impersonateUser({ userId });
      if (error) throw new Error(error.message ?? 'Impersonation failed');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      void navigate({ to: '/' });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-2">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  {user.role && (
                    <Badge variant="secondary">{user.role.name}</Badge>
                  )}
                  <Badge className={user.isBanned ? 'bg-banned-bg text-banned-fg' : 'bg-active-bg text-active-fg'}>
                    {user.isBanned ? 'banned' : 'active'}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            {hasImpersonatePermission && (
              canImpersonate ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={impersonateMutation.isPending}
                  onClick={() => impersonateMutation.mutate()}
                >
                  <LogIn className="size-4" />
                  Impersonate User
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger render={
                    <span tabIndex={0} className="inline-flex">
                      <Button variant="outline" className="gap-2" disabled>
                        <LogIn className="size-4" />
                        Impersonate User
                      </Button>
                    </span>
                  } />
                  <TooltipContent>
                    {isImpersonating
                      ? 'Cannot start a new impersonation session while already impersonating'
                      : 'Cannot impersonate users with equal or higher role priority'}
                  </TooltipContent>
                </Tooltip>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Profiles ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <EmptyState message="No profiles found for this user." />
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Card key={profile.userProfileId} className="border">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <ProfileAvatar name={profile.name} className="size-12 shrink-0 shadow-md" fallbackClassName="bg-gradient-to-br from-blue-600 to-blue-700 text-white" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-0.5">{profile.name}</h3>
                          <p className="text-sm text-muted-foreground mb-1">{profile.email}</p>
                          {profile.bio && (
                            <p className="text-sm text-muted-foreground mb-1 line-clamp-2">{profile.bio}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                            {profile.phoneNumber && <span>📞 {profile.phoneNumber}</span>}
                            {profile.fax && <span>📠 {profile.fax}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Created {new Date(profile.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/admin/users/$userId/profile/$profileId"
                        params={{ userId, profileId: profile.userProfileId }}
                        className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' gap-2 shrink-0'}
                      >
                        <Eye className="size-4" />
                        View Posts
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function UserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = Route.useNavigate();

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin/users' })} label="Back to Users" />
      <PageHeader
        title="User Details"
        description="View and manage user information, profiles, and activity"
      />
      <Suspense fallback={<UserDetailSkeleton />}>
        <UserDetailContent userId={userId} />
      </Suspense>
    </main>
  );
}
