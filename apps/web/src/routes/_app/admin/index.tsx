import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { Users, Shield, Flag, ChevronRight } from 'lucide-react';
import { api } from '#/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';

const adminOptions = [
  {
    id: 'accounts',
    title: 'Manage Accounts',
    description: 'View and manage user accounts, permissions, and profiles',
    icon: Users,
    path: '/admin/accounts',
  },
  {
    id: 'roles',
    title: 'Manage Roles',
    description: 'Configure user roles and permissions for the platform',
    icon: Shield,
    path: '/admin/roles',
  },
  {
    id: 'reports',
    title: 'Manage Reports and Bans',
    description: 'Review user reports, moderate content, and manage bans',
    icon: Flag,
    path: '/admin/reports',
  },
];

export const userPermissionsQueryOptions = queryOptions({
  queryKey: ['users', 'me'],
  queryFn: async () => {
    const { data, error } = await api.users.me.get();
    if (error || !data) {
      throw new Error('Unauthorized');
    }
    return data;
  },
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute('/_app/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage platform settings, users, and content moderation
        </p>
      </div>

      <Suspense fallback={<OptionsSkeleton />}>
        <AdminOptions navigate={navigate} />
      </Suspense>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Overview of platform activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">1,247</p>
              <p className="text-sm text-muted-foreground mt-1">Total Users</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">342</p>
              <p className="text-sm text-muted-foreground mt-1">Active Posts</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">23</p>
              <p className="text-sm text-muted-foreground mt-1">Pending Reports</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold">12</p>
              <p className="text-sm text-muted-foreground mt-1">Active Bans</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function OptionsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 bg-muted rounded-lg mb-4 w-12 h-12" />
              <div className="w-5 h-5 bg-muted rounded" />
            </div>
            <div className="h-6 bg-muted rounded w-40 mb-2" />
            <div className="h-4 bg-muted rounded w-full" />
          </CardHeader>
          <CardContent>
            <div className="h-10 bg-muted rounded w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface AdminOptionsProps {
  navigate: ReturnType<typeof useNavigate>;
}

function AdminOptions({ navigate }: AdminOptionsProps) {
  const { data: user } = useSuspenseQuery(userPermissionsQueryOptions);
  const permissions = user?.role?.permissions ?? [];

  const canManageUsers = permissions.includes('admin:users:view') ||
    permissions.includes('admin:users:ban') ||
    permissions.includes('admin:users:assign-role');
  const canManageRoles = permissions.includes('admin:roles:manage') ||
    permissions.includes('admin:roles:reorder') ||
    permissions.includes('admin:roles:set-default');

  const visibleOptions = adminOptions.filter(option => {
    if (option.id === 'accounts') return canManageUsers;
    if (option.id === 'roles') return canManageRoles;
    if (option.id === 'reports') return canManageUsers;
    return true;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {visibleOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Card
            key={option.id}
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => navigate({ to: option.path })}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-3 bg-primary/10 rounded-lg mb-4">
                  <Icon className="size-6 text-primary" />
                </div>
                <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <CardTitle>{option.title}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
