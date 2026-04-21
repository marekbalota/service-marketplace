import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Suspense, useState } from 'react';
import { useSuspenseQuery, useQuery, useQueryClient, queryOptions, keepPreviousData, useMutation } from '@tanstack/react-query';
import { Ban, Eye, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '#/api';
import { BackButton } from '#/components/BackButton';
import { PageHeader } from '#/components/PageHeader';
import { StatCard } from '../-components/StatCard';
import { EmptyState } from '#/components/EmptyState';
import { SearchFilterBar } from '#/components/SearchFilterBar';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';
import { Skeleton } from '#/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '#/components/ui/dialog';
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
import { Field, FieldError } from '#/components/ui/field';
import { Textarea } from '#/components/ui/textarea';
import { Input } from '#/components/ui/input';
import { Permissions, hasPermissions } from '@marketplace/shared';
import { useActiveUser } from '#/contexts/ActiveUserContext';

import type { AdminUsersModel } from 'api';

export type User = AdminUsersModel['usersResponse']['items'][number];

const PAGE_SIZE = 10;

export const usersQueryOptions = (params: {
  search: string;
  role: string;
  status: string;
  page: number;
}) => queryOptions({
  queryKey: ['admin', 'users', params],
  queryFn: async () => {
    const { data, error } = await api.admin.users.get({
      query: {
        search: params.search || undefined,
        role: params.role !== 'all' ? params.role : undefined,
        isBanned:
          params.status === 'banned' ? true :
          params.status === 'active' ? false :
          undefined,
        offset: (params.page - 1) * PAGE_SIZE,
        size: PAGE_SIZE,
      },
    });
    if (error) throw error;
    return data;
  },
  placeholderData: keepPreviousData,
});

export const assignableRolesQueryOptions = queryOptions({
  queryKey: ['admin', 'users', 'assignable-roles'],
  queryFn: async () => {
    const { data, error } = await api.admin.users['roles'].assignable.get();
    if (error) throw error;
    return data ?? [];
  },
});

export const allRolesQueryOptions = queryOptions({
  queryKey: ['admin', 'roles'],
  queryFn: async () => {
    const { data, error } = await api.admin.roles.get();
    if (error) throw error;
    return data ?? [];
  },
});

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  role: z.string().optional().catch(undefined),
  status: z.enum(['all', 'active', 'banned']).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
});

const banFormSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  durationType: z.enum(['permanent', 'until-date']),
  expiresAt: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.durationType === 'until-date') {
    if (!data.expiresAt) {
      ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry date is required' });
    } else if (new Date(data.expiresAt) <= new Date()) {
      ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry date must be in the future' });
    }
  }
});

type BanFormValues = z.infer<typeof banFormSchema>;

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let p = Math.max(1, current - 1); p <= Math.min(total, current + 1); p++) {
    pages.add(p);
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]!;
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined && curr - prev > 1) result.push('ellipsis');
    result.push(curr);
  }
  return result;
}

export const Route = createFileRoute('/_app/admin/accounts')({
  validateSearch: searchSchema,
  component: ManageAccounts,
});

const STATUS_LABELS: Record<string, string> = {
  all: 'All Statuses',
  active: 'Active',
  banned: 'Banned',
};

function UnbanDialog({
  open,
  userName,
  onConfirm,
  onClose,
}: {
  open: boolean;
  userName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unban {userName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will restore full access for this user.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={async () => {
              setIsPending(true);
              try {
                await onConfirm();
              } finally {
                setIsPending(false);
              }
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BanDialog({
  open,
  userName,
  onSubmit,
  onClose,
}: {
  open: boolean;
  userName: string;
  onSubmit: (reason: string, expiresAt?: Date) => Promise<void>;
  onClose: () => void;
}) {
  const { control, handleSubmit, watch, reset, formState } = useForm<BanFormValues>({
    resolver: zodResolver(banFormSchema),
    mode: 'onTouched',
    defaultValues: { reason: '', durationType: 'permanent', expiresAt: '' },
  });

  const durationType = watch('durationType');

  const durationLabels: Record<string, string> = {
    permanent: 'Permanent',
    'until-date': 'Until date',
  };

  const submit: SubmitHandler<BanFormValues> = async (values) => {
    const expiresAt =
      values.durationType === 'until-date' && values.expiresAt
        ? new Date(values.expiresAt)
        : undefined;
    await onSubmit(values.reason, expiresAt);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {userName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <Controller
            control={control}
            name="reason"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <label className="text-sm font-medium">Reason *</label>
                <Textarea
                  {...field}
                  aria-invalid={fieldState.invalid}
                  placeholder="Describe the reason for this ban..."
                  rows={3}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="durationType"
            render={({ field }) => (
              <Field>
                <label className="text-sm font-medium">Duration</label>
                <Select
                  value={field.value}
                  onValueChange={(v) => { field.onChange(v); field.onBlur(); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{durationLabels[field.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(durationLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          {durationType === 'until-date' && (
            <Controller
              control={control}
              name="expiresAt"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <label className="text-sm font-medium">Expiry date</label>
                  <Input
                    {...field}
                    type="date"
                    aria-invalid={fieldState.invalid}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Ban User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserCard({
  user,
  getRoleColor,
  getStatusColor,
  onBan,
  onUnban,
}: {
  user: User;
  getRoleColor: (name: string | null) => string;
  getStatusColor: (isBanned: boolean) => string;
  onBan: (userId: string, reason: string, expiresAt?: Date) => Promise<void>;
  onUnban: (userId: string) => Promise<void>;
}) {
  const { user: currentUser } = useActiveUser();
  const permissions = currentUser?.role?.permissions ?? [];
  const canAssignRole = hasPermissions(permissions, [Permissions.AdminUsersAssignRole]);
  const canBan = hasPermissions(permissions, [Permissions.AdminUsersBan]);
  const canViewUser = hasPermissions(permissions, [Permissions.AdminUsersView]);

  const navigate = useNavigate();

  const { data: assignableRoles = [] } = useQuery(assignableRolesQueryOptions);

  const roleIsAssignable = assignableRoles.some((r) => r.roleId === user.role?.roleId);

  const queryClient = useQueryClient();
  const roleMutation = useMutation({
    mutationFn: (roleId: string) =>
      api.admin.users({ id: user.userId }).role.patch({ roleId }).then(({ error }) => {
        if (error) throw error;
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);

  return (
    <Card className="border">
      <CardContent className="pt-2 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold">{user.name}</h3>
              <Badge className={getRoleColor(user.role?.name ?? null)}>
                {user.role?.name ?? 'User'}
              </Badge>
              <Badge className={getStatusColor(user.isBanned)}>
                {user.isBanned ? 'banned' : 'active'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canAssignRole && roleIsAssignable && (
              <div className="flex items-center gap-1">
                <Select
                  value={user.role?.roleId ?? ''}
                  disabled={roleMutation.isPending}
                  onValueChange={(roleId) => {
                    if (!roleId) return;
                    roleMutation.mutate(roleId);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue>{user.role?.name ?? 'No role'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r.roleId} value={r.roleId}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {roleMutation.isPending && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>
            )}

            {canViewUser && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate({ to: '../accounts/$userId', params: { userId: user.userId } })}
              >
                <Eye className="size-4" />
                View
              </Button>
            )}

            {canBan && (
              user.isBanned ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnbanDialogOpen(true)}
                  >
                    Unban
                  </Button>
                  <UnbanDialog
                    open={unbanDialogOpen}
                    userName={user.name}
                    onConfirm={async () => {
                      await onUnban(user.userId);
                      setUnbanDialogOpen(false);
                    }}
                    onClose={() => setUnbanDialogOpen(false)}
                  />
                </>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBanDialogOpen(true)}
                  >
                    <Ban className="size-4 mr-2" />
                    Ban
                  </Button>
                  <BanDialog
                    open={banDialogOpen}
                    userName={user.name}
                    onSubmit={async (reason, expiresAt) => {
                      await onBan(user.userId, reason, expiresAt);
                      setBanDialogOpen(false);
                    }}
                    onClose={() => setBanDialogOpen(false)}
                  />
                </>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleSelect() {
  const { role = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: allRoles = [] } = useQuery(allRolesQueryOptions)

  const roleLabels: Record<string, string> = {
    all: 'All Roles',
    ...Object.fromEntries(allRoles.map((r) => [r.name, r.name])),
  }

  return (
    <Select
      value={role}
      onValueChange={(value) => {
        if (!value) return;
        navigate({ search: (prev) => ({ ...prev, role: value === 'all' ? undefined : value, page: undefined }) });
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue>{roleLabels[role] ?? 'All Roles'}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[var(--anchor-width)]">
        <SelectItem value="all">All Roles</SelectItem>
        {allRoles.map((r) => (
          <SelectItem key={r.roleId} value={r.name}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function StatusSelect() {
  const { status = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <Select
      value={status}
      onValueChange={(value) =>
        navigate({
          search: (prev) => ({
            ...prev,
            status: value === 'all' ? undefined : (value as 'active' | 'banned'),
            page: undefined,
          }),
        })
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
  )
}

function ManageAccounts() {
  const navigate = Route.useNavigate();
  const { q = '' } = Route.useSearch();

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin' })} label="Back to Admin" />

      <PageHeader
        title="Manage Accounts"
        description="View and manage user accounts, roles, and permissions"
      />

      <Card className="mb-6">
        <CardContent >
          <SearchFilterBar
            searchPlaceholder="Search by name or email..."
            searchValue={q}
            onSearchChange={(value) =>
              navigate({ search: (prev) => ({ ...prev, q: value || undefined, page: undefined }) })
            }
            filters={[
              { label: 'Role', control: <RoleSelect />, desktopWidth: 'w-[180px]' },
              { label: 'Status', control: <StatusSelect />, desktopWidth: 'w-[160px]' },
            ]}
            sheetTitle="Filter Accounts"
            sheetDescription="Narrow the list by role or status"
          />
        </CardContent>
      </Card>

      <Suspense fallback={<StatsAndListSkeleton />}>
        <AccountsData />
      </Suspense>
    </main>
  );
}

function StatsAndListSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-2 pb-2">
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AccountsData() {
  const navigate = Route.useNavigate();
  const { q = '', role = 'all', status = 'all', page = 1 } = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: usersData, isFetching } = useSuspenseQuery(
    usersQueryOptions({ search: q, role, status, page })
  );

  const users = usersData?.items ?? [];
  const total = usersData?.total ?? 0;
  const totalBanned = usersData?.totalBanned ?? 0;
  const totalPages = usersData?.totalPages ?? 1;

  const setPage = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }) });

  const handleBanUser = async (userId: string, reason: string, expiresAt?: Date) => {
    const { error } = await api.admin.users({ id: userId }).ban.patch({ reason, expiresAt });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const handleActivateUser = async (userId: string) => {
    const { error } = await api.admin.users({ id: userId }).unban.patch();
    if (error) throw error;
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
        <StatCard value={total} label="Total Users" />
        <StatCard value={total - totalBanned} label="Active Users" />
        <StatCard value={totalBanned} label="Banned" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            User Accounts ({total})
            {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <UserCard
                key={user.userId}
                user={user}
                getRoleColor={getRoleColor}
                getStatusColor={getStatusColor}
                onBan={handleBanUser}
                onUnban={handleActivateUser}
              />
            ))}
            {users.length === 0 && (
              <EmptyState message="No accounts found." />
            )}
          </div>

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
        </CardContent>
      </Card>
    </>
  );
}
