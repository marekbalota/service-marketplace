import { useNavigate, createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useSuspenseQuery, useQuery, useQueryClient, queryOptions } from '@tanstack/react-query';
import { ArrowLeft, Search, MoreVertical, Ban, Shield, Trash2, Eye, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { api } from '#/api';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';

export type User = AdminUsersModel['usersResponse']['items'][number];

import type { AdminUsersModel } from 'api';

export const usersQueryOptions = (search: string) => queryOptions({
  queryKey: ['admin', 'users', search],
  queryFn: async () => {
    const response = await api.admin.users.get({
      query: search ? { search } : undefined,
    });
    return response.data;
  },
});

export const assignableRolesQueryOptions = queryOptions({
  queryKey: ['admin', 'users', 'assignable-roles'],
  queryFn: async () => {
    const response = await api.admin.users['roles'].assignable.get();
    return response.data ?? [];
  },
});

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  role: z.string().optional().catch(undefined),
  status: z.enum(['all', 'active', 'banned']).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/admin/accounts')({
  validateSearch: searchSchema,
  component: ManageAccounts,
});

const STATUS_LABELS: Record<string, string> = {
  all: 'All Statuses',
  active: 'Active',
  banned: 'Banned',
};

function ManageAccounts() {
  const navigate = useNavigate();

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <Button
        variant="ghost"
        className="mb-4 gap-2"
        onClick={() => navigate({ to: '/admin' })}
      >
        <ArrowLeft className="size-4" />
        Back to Admin
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl mb-2">Manage Accounts</h1>
        <p className="text-muted-foreground">
          View and manage user accounts, roles, and permissions
        </p>
      </div>

      <FiltersCard />

      <Suspense fallback={<StatsAndListSkeleton />}>
        <AccountsData />
      </Suspense>
    </main>
  );
}

function FiltersCard() {
  const { q = '', role = 'all', status = 'all' } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: assignableRoles = [] } = useQuery(assignableRolesQueryOptions);

  const roleLabels: Record<string, string> = {
    all: 'All Roles',
    ...Object.fromEntries(assignableRoles.map((r) => [r.name.toLowerCase(), r.name])),
  };

  return (
    <Card className="mb-6">
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={q}
              onChange={(e) =>
                navigate({ search: (prev) => ({ ...prev, q: e.target.value || undefined }) })
              }
              className="pl-10"
            />
          </div>
          <Select
            value={role}
            onValueChange={(value) =>
              navigate({ search: (prev) => ({ ...prev, role: value === 'all' ? undefined : value }) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue>{roleLabels[role] ?? 'All Roles'}</SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[var(--anchor-width)]">
              <SelectItem value="all">All Roles</SelectItem>
              {assignableRoles.map((r) => (
                <SelectItem key={r.roleId} value={r.name.toLowerCase()}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) =>
              navigate({ search: (prev) => ({ ...prev, status: value === 'all' ? undefined : value as 'active' | 'banned' }) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue>{STATUS_LABELS[status]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[var(--anchor-width)]">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsAndListSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-2 pb-2">
              <div className="h-8 bg-muted rounded w-16 mb-2 animate-pulse" />
              <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AccountsData() {
  const { q = '', role = 'all', status = 'all' } = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: usersData, isFetching } = useSuspenseQuery({
    ...usersQueryOptions(q),
    placeholderData: (prev) => prev,
  });
  const users = usersData?.items ?? [];

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(q.toLowerCase()) ||
      user.email.toLowerCase().includes(q.toLowerCase());
    const matchesRole = role === 'all' || user.roleName?.toLowerCase() === role.toLowerCase();
    const matchesStatus =
      status === 'all' ||
      (status === 'active' && !user.isBanned) ||
      (status === 'banned' && user.isBanned);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleBanUser = async (userId: string) => {
    await api.admin.users({ id: userId }).ban.patch({ reason: 'Violation of terms' });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const handleActivateUser = async (userId: string) => {
    await api.admin.users({ id: userId }).unban.patch();
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const getRoleColor = (roleName: string | null) => {
    if (!roleName) return 'bg-gray-100 text-gray-800';
    if (roleName.toLowerCase() === 'admin') return 'bg-purple-100 text-purple-800';
    if (roleName.toLowerCase() === 'moderator') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (isBanned: boolean) =>
    isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-2 pb-2">
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2">
            <p className="text-2xl font-bold">
              {users.filter((u) => !u.isBanned).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-2 pb-2">
            <p className="text-2xl font-bold">
              {users.filter((u) => u.isBanned).length}
            </p>
            <p className="text-sm text-muted-foreground">Banned</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            User Accounts ({filteredUsers.length})
            {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.userId} className="border">
                <CardContent className="pt-2 pb-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{user.name}</h3>
                        <Badge className={getRoleColor(user.roleName)}>
                          {user.roleName || 'User'}
                        </Badge>
                        <Badge className={getStatusColor(user.isBanned)}>
                          {user.isBanned ? 'banned' : 'active'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="size-4" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Shield className="size-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="size-4 mr-2" />
                            Make Moderator
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="size-4 mr-2" />
                            Make User
                          </DropdownMenuItem>
                          {user.isBanned ? (
                            <DropdownMenuItem onClick={() => handleActivateUser(user.userId)}>
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleBanUser(user.userId)}>
                              <Ban className="size-4 mr-2" />
                              Ban User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="size-4 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No accounts found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
