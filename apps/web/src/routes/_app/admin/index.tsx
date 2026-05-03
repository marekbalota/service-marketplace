import { createFileRoute, Link } from '@tanstack/react-router';
import { Users, Shield, Flag, ChevronRight, FolderTree } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Button } from '#/components/ui/button';
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
  {
    id: 'categories',
    title: 'Manage Categories',
    description: 'Create, edit, and organize service categories',
    icon: FolderTree,
    path: '/admin/categories',
  },
];

export const Route = createFileRoute('/_app/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader
        title="Admin Dashboard"
        description="Manage platform settings, users, and content moderation"
      />

      <AdminOptions />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-500/20 rounded-lg border border-blue-200 dark:border-blue-400/30 hover:bg-blue-200 dark:hover:bg-blue-500/25 transition-colors cursor-pointer">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">1,247</p>
                <p className="text-sm text-muted-foreground mt-1">Total Users</p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-2 font-medium">View Analytics →</p>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-500/20 rounded-lg border border-green-200 dark:border-green-400/30 hover:bg-green-200 dark:hover:bg-green-500/25 transition-colors cursor-pointer">
                <p className="text-3xl font-bold text-green-600 dark:text-green-300">342</p>
                <p className="text-sm text-muted-foreground mt-1">Active Posts</p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-2 font-medium">View Analytics →</p>
              </div>
              <div className="p-4 bg-orange-100 dark:bg-orange-500/20 rounded-lg border border-orange-200 dark:border-orange-400/30 hover:bg-orange-200 dark:hover:bg-orange-500/25 transition-colors cursor-pointer">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-300">1,856</p>
                <p className="text-sm text-muted-foreground mt-1">Total Messages</p>
                <p className="text-xs text-orange-600 dark:text-orange-300 mt-2 font-medium">View Analytics →</p>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-500/20 rounded-lg border border-red-200 dark:border-red-400/30">
                <p className="text-3xl font-bold text-red-600 dark:text-red-300">12</p>
                <p className="text-sm text-muted-foreground mt-1">Active Bans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="size-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">New user registered</p>
                  <p className="text-xs text-muted-foreground">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="size-2 rounded-full bg-green-500 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">New post published</p>
                  <p className="text-xs text-muted-foreground">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="size-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Post reported by user</p>
                  <p className="text-xs text-muted-foreground">1 hour ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-2 rounded-full bg-gray-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">User role updated</p>
                  <p className="text-xs text-muted-foreground">3 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
    Permissions.AdminUsersImpersonate,
    Permissions.AdminPostsDeleteAny,
  ]);
  const canManageRoles = hasPermissions(permissions, [Permissions.AdminRolesManage]);
  const canManageCategories = hasPermissions(permissions, [Permissions.AdminCategoriesManage]);

  const visibleOptions = adminOptions.filter((option) => {
    if (option.id === 'users') return canManageUsers;
    if (option.id === 'roles') return canManageRoles;
    if (option.id === 'reports') return canManageUsers;
    if (option.id === 'categories') return canManageCategories;
    return true;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {visibleOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Link key={option.id} to={option.path} className="block group hover:no-underline">
            <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-primary/10 rounded-lg mb-4">
                    <Icon className="size-6 text-primary" />
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" tabIndex={-1} aria-hidden="true">
                  Open
                </Button>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
