import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useSuspenseQuery, queryOptions } from '@tanstack/react-query';
import { Users, Shield, Flag, ChevronRight } from 'lucide-react';
import { api } from '#/api';
import { StatCard } from './-components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { PageHeader } from '#/components/PageHeader';
import { Skeleton } from '#/components/ui/skeleton';
import { Permissions, hasAnyPermission } from '@marketplace/shared';

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
      <PageHeader
        title="Admin Dashboard"
        description="Manage platform settings, users, and content moderation"
      />

      <Suspense fallback={<OptionsSkeleton />}>
        <AdminOptions navigate={navigate} />
      </Suspense>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Overview of platform activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard value="1,247" label="Total Users" />
            <StatCard value="342" label="Active Posts" />
            <StatCard value="23" label="Pending Reports" />
            <StatCard value="12" label="Active Bans" />
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
        <Card key={i}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <Skeleton className="mb-4 size-12 rounded-lg" />
              <Skeleton className="size-5" />
            </div>
            <Skeleton className="mb-2 h-6 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
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

  const canManageUsers = hasAnyPermission(permissions, [
    Permissions.AdminUsersView,
    Permissions.AdminUsersBan,
    Permissions.AdminUsersAssignRole,
  ]);
  const canManageRoles = hasAnyPermission(permissions, [
    Permissions.AdminRolesManage,
  ]);

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
