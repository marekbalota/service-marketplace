import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Ban, Eye, Loader2 } from 'lucide-react'
import { api } from '#/api'
import { EmptyState } from '#/components/EmptyState'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { PaginationBar } from '#/components/PaginationBar'
import { StatCard } from '../../-components/StatCard'
import { useCurrentUser } from '#/lib/queries/users'
import { Permissions, hasPermissions } from '@marketplace/shared'
import { usersQueryOptions, assignableRolesQueryOptions } from '../-queries/users'
import { BanDialog } from './BanDialog'
import { UnbanDialog } from './UnbanDialog'
import { Route } from '../index'
import type { AdminUsersModel } from 'api'

type User = AdminUsersModel['usersResponse']['items'][number]

function getRoleColor(roleName: string | null) {
  if (!roleName) return 'bg-gray-100 text-gray-800'
  if (roleName.toLowerCase() === 'admin') return 'bg-purple-100 text-purple-800'
  if (roleName.toLowerCase() === 'moderator') return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-800'
}

function getStatusColor(isBanned: boolean) {
  return isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
}

function UserCard({ user }: { user: User }) {
  const { data: currentUser } = useCurrentUser()
  const permissions = currentUser?.role?.permissions ?? []
  const canAssignRole = hasPermissions(permissions, [Permissions.AdminUsersAssignRole])
  const canBan = hasPermissions(permissions, [Permissions.AdminUsersBan])
  const canViewUser = hasPermissions(permissions, [Permissions.AdminUsersView])

  const navigate = useNavigate()
  const { data: assignableRoles = [] } = useQuery(assignableRolesQueryOptions)
  const roleIsAssignable = assignableRoles.some((r) => r.roleId === user.role?.roleId)

  const queryClient = useQueryClient()

  const roleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await api.admin.users({ id: user.userId }).role.patch({ roleId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const banMutation = useMutation({
    mutationFn: async ({ reason, expiresAt }: { reason: string; expiresAt?: Date }) => {
      const { error } = await api.admin.users({ id: user.userId }).ban.patch({ reason, expiresAt })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setBanDialogOpen(false)
    },
  })

  const unbanMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.admin.users({ id: user.userId }).unban.patch()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setUnbanDialogOpen(false)
    },
  })

  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false)

  return (
    <Card className="border">
      <CardContent className="pt-2 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold">{user.name}</h3>
              <Badge className={getRoleColor(user.role?.name ?? null)}>{user.role?.name ?? 'User'}</Badge>
              <Badge className={getStatusColor(user.isBanned)}>{user.isBanned ? 'banned' : 'active'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{user.email}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canAssignRole && roleIsAssignable && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Select
                    value={user.role?.roleId ?? ''}
                    disabled={roleMutation.isPending}
                    onValueChange={(roleId) => { if (roleId) roleMutation.mutate(roleId) }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue>{user.role?.name ?? 'No role'}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => (
                        <SelectItem key={r.roleId} value={r.roleId}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {roleMutation.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                </div>
                {roleMutation.isError && (
                  <p className="text-xs text-destructive">Failed to update role</p>
                )}
              </div>
            )}

            {canViewUser && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate({ to: '/admin/users/$userId', params: { userId: user.userId } })}
              >
                <Eye className="size-4" />
                View
              </Button>
            )}

            {canBan && roleIsAssignable && (
              user.isBanned ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unbanMutation.isPending}
                    onClick={() => setUnbanDialogOpen(true)}
                  >
                    {unbanMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                    Unban
                  </Button>
                  <UnbanDialog
                    open={unbanDialogOpen}
                    userName={user.name}
                    onConfirm={() => unbanMutation.mutateAsync()}
                    onClose={() => setUnbanDialogOpen(false)}
                  />
                </>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={banMutation.isPending}
                    onClick={() => setBanDialogOpen(true)}
                  >
                    <Ban className="size-4 mr-2" />
                    Ban
                  </Button>
                  <BanDialog
                    open={banDialogOpen}
                    userName={user.name}
                    onSubmit={(reason, expiresAt) => banMutation.mutateAsync({ reason, expiresAt })}
                    onClose={() => setBanDialogOpen(false)}
                  />
                </>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function UsersTable() {
  const navigate = Route.useNavigate()
  const { q = '', role = 'all', status = 'all', page = 1 } = Route.useSearch()
  const { data: usersData, isFetching } = useSuspenseQuery(usersQueryOptions({ search: q, role, status, page }))

  const users = usersData?.items ?? []
  const total = usersData?.total ?? 0
  const totalBanned = usersData?.totalBanned ?? 0
  const totalPages = usersData?.totalPages ?? 1

  const setPage = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }) })

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
              <UserCard key={user.userId} user={user} />
            ))}
            {users.length === 0 && <EmptyState message="No accounts found." />}
          </div>

          {totalPages > 1 && (
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
          )}
        </CardContent>
      </Card>
    </>
  )
}
