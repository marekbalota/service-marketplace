import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { User as UserIcon, Mail, Calendar, LogIn, Eye } from 'lucide-react';
import { api } from '#/api';
import { BackButton } from '#/components/BackButton';
import { PageHeader } from '#/components/PageHeader';
import { EmptyState } from '#/components/EmptyState';
import { Button } from '#/components/ui/button';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { Skeleton } from '#/components/ui/skeleton';

export const userDetailQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['admin', 'users', userId],
    queryFn: async () => {
      const { data, error } = await api.admin.users({ id: userId }).get();
      if (error) throw error;
      return data!;
    },
  });

export const userProfilesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['admin', 'users', userId, 'profiles'],
    queryFn: async () => {
      const { data, error } = await api.admin.users({ id: userId }).profiles.get();
      if (error) throw error;
      return data ?? [];
    },
  });

const getRoleColor = (name: string | null) => {
  if (!name) return 'bg-gray-100 text-gray-800';
  if (name.toLowerCase() === 'admin' || name.toLowerCase() === 'superadmin') return 'bg-purple-100 text-purple-800';
  if (name.toLowerCase() === 'moderator') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

const getStatusColor = (isBanned: boolean) =>
  isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';

export const Route = createFileRoute('/_app/admin/users/$userId/')({
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
  const navigate = Route.useNavigate();
  const { data: user } = useSuspenseQuery(userDetailQueryOptions(userId));
  const { data: profiles = [] } = useSuspenseQuery(userProfilesQueryOptions(userId));

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="size-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md shrink-0">
                <UserIcon className="size-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  {user.role && (
                    <Badge className={getRoleColor(user.role.name)}>{user.role.name}</Badge>
                  )}
                  <Badge className={getStatusColor(user.isBanned)}>
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
            <Button variant="outline" className="gap-2" disabled>
              <LogIn className="size-4" />
              Impersonate User
              {/* TODO: implement impersonation */}
            </Button>
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
                        <div className="size-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md shrink-0">
                          <UserIcon className="size-6 text-white" />
                        </div>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 shrink-0"
                        onClick={() =>
                          navigate({
                            to: '/admin/users/$userId/profile/$profileId',
                            params: { userId, profileId: profile.userProfileId },
                          })
                        }
                      >
                        <Eye className="size-4" />
                        View Posts
                      </Button>
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
