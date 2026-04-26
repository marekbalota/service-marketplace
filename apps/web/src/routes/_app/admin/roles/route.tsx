import { useNavigate, createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense, useState } from 'react'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { BackButton } from '#/components/BackButton'
import { PageHeader } from '#/components/PageHeader'
import { useCurrentUser } from '#/lib/queries/users'
import { Permissions, hasPermissions } from '@marketplace/shared'
import { CreateRoleButton, type NewRoleState } from './-components/CreateRoleButton'
import { RolesContent } from './-components/RolesContent'
import type { Role } from './-components/SortableRoleCard'

export const Route = createFileRoute('/_app/admin/roles')({
  beforeLoad: ({ context }) => {
    const user = context.user
    const permissions = user?.role?.permissions ?? []
    if (!hasPermissions(permissions, [Permissions.AdminRolesManage])) {
      throw redirect({ to: '/admin' })
    }
  },
  component: ManageRoles,
})

function ManageRoles() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const userPriority = user?.role?.priority ?? 0

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [newRole, setNewRole] = useState<NewRoleState>({
    name: '',
    description: '',
    permissionIds: [],
  })

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin' })} label="Back to Admin" />

      <PageHeader
        title="Manage Roles"
        description="Configure user roles and permissions for the platform"
        action={
          <Suspense fallback={null}>
            <CreateRoleButton
              isOpen={isCreateDialogOpen}
              setIsOpen={setIsCreateDialogOpen}
              newRole={newRole}
              setNewRole={setNewRole}
            />
          </Suspense>
        }
      />

      <Suspense fallback={<RolesSkeleton />}>
        <RolesContent
          editingRole={editingRole}
          setEditingRole={setEditingRole}
          newRole={newRole}
          setNewRole={setNewRole}
          userPriority={userPriority}
        />
      </Suspense>
    </main>
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
