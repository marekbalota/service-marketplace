import { createFileRoute, Link } from '@tanstack/react-router';
import { Users, Shield, Flag, ChevronRight } from 'lucide-react';
import { StatCard } from './-components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { PageHeader } from '#/components/PageHeader';
import { Permissions, hasAnyPermission, hasPermissions } from '@marketplace/shared';
import { useCurrentUser } from '#/lib/queries/users';

const adminOptions = [
  {
    id: 'users',
    title: 'Manage Accounts',
    description: 'View and manage user accounts, permissions, and profiles',
    icon: Users,
    path: '/admin/users',
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

export const Route = createFileRoute('/_app/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <PageHeader
        title="Admin Dashboard"
        description="Manage platform settings, users, and content moderation"
      />

      <AdminOptions />

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

function AdminOptions() {
  const { data: user } = useCurrentUser();
  const permissions = user?.role?.permissions ?? [];

  const canManageUsers = hasAnyPermission(permissions, [
    Permissions.AdminUsersView,
    Permissions.AdminUsersBan,
    Permissions.AdminUsersAssignRole,
  ]);
  const canManageRoles = hasPermissions(permissions, [
    Permissions.AdminRolesManage,
  ]);

  const visibleOptions = adminOptions.filter(option => {
    if (option.id === 'users') return canManageUsers;
    if (option.id === 'roles') return canManageRoles;
    if (option.id === 'reports') return canManageUsers;
    return true;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {visibleOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Link key={option.id} to={option.path} className="block group hover:no-underline">
            <Card className="hover:shadow-lg transition-shadow">
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
          </Link>
        );
      })}
    </div>
  );
}
