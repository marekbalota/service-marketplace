import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense, useState } from 'react'
import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api } from '#/api'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { BackButton } from '#/components/BackButton'
import { PageHeader } from '#/components/PageHeader'
import { useCurrentUser } from '#/lib/queries/users'
import { rolesQueryOptions } from '#/lib/queries/admin'
import { Permissions, hasPermissions } from '@marketplace/shared'
import { permissionsQueryOptions } from './-queries/admin'
import { RoleDialog, type RoleValues } from './-components/RoleDialog'
import { RolesContent } from './-components/RolesContent'

export const Route = createFileRoute('/_app/admin/roles')({
  beforeLoad: ({ context: { user } }) => {
    const permissions = user?.role?.permissions ?? []
    if (!hasPermissions(permissions, [Permissions.AdminRolesManage])) {
      throw redirect({ to: '/admin' })
    }
  },
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(rolesQueryOptions)
    void queryClient.prefetchQuery(permissionsQueryOptions)
  },
  component: ManageRoles,
})

function ManageRoles() {
  const navigate = Route.useNavigate()
  const { data: user } = useCurrentUser()
  const userPriority = user?.role?.priority ?? 0
  const userPermissionNames = user?.role?.permissions ?? []

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin' })} label="Back to Admin" />

      <PageHeader
        title="Manage Roles"
        description="Configure user roles and permissions for the platform"
        action={
          <Suspense fallback={<Skeleton className="h-9 w-32" />}>
            <CreateRoleAction userPermissionNames={userPermissionNames} />
          </Suspense>
        }
      />

      <Suspense fallback={<RolesSkeleton />}>
        <RolesContent userPriority={userPriority} userPermissionNames={userPermissionNames} />
      </Suspense>
    </main>
  )
}

function CreateRoleAction({ userPermissionNames }: { userPermissionNames: string[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const { data: permissions } = useSuspenseQuery(permissionsQueryOptions)
  const queryClient = useQueryClient()

  const grantablePermissionIds = new Set(
    permissions.filter(p => userPermissionNames.includes(p.name)).map(p => p.permissionId)
  )

  const createMutation = useMutation({
    mutationFn: async (values: RoleValues) => {
      const { error } = await api.admin.roles.post(values)
      if (error) throw error
    },
    onSuccess: () => {
      setIsCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
    },
  })

  return (
    <>
      <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
        <Plus className="size-4" />
        Create Role
      </Button>
      <RoleDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create New Role"
        description="Define a new role with specific permissions"
        submitLabel="Create Role"
        permissions={permissions}
        grantablePermissionIds={grantablePermissionIds}
        onSubmit={(values) => createMutation.mutateAsync(values)}
      />
    </>
  )
}

function RolesSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
