import { useState, useEffect } from 'react'
import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { api } from '#/api'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { StatCard } from '../../-components/StatCard'
import { rolesQueryOptions } from '#/lib/queries/admin'
import { permissionsQueryOptions } from '../-queries/admin'
import { SortableRoleCard } from './SortableRoleCard'
import type { Role } from './SortableRoleCard'

interface RolesContentProps {
  userPriority: number
}

export function RolesContent({ userPriority }: RolesContentProps) {
  const { data: rolesData = [] } = useSuspenseQuery(rolesQueryOptions)
  const { data: permissions = [] } = useSuspenseQuery(permissionsQueryOptions)
  const queryClient = useQueryClient()

  const [roles, setRoles] = useState<Role[]>(rolesData)
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)
  const [settingDefaultRoleId, setSettingDefaultRoleId] = useState<string | null>(null)
  const sortableRoles = roles.filter(r => r.priority < userPriority)

  useEffect(() => {
    setRoles(rolesData)
  }, [rolesData])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await api.admin.roles({ id: roleId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      setDeletingRoleId(null)
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await api.admin.roles({ id: roleId }).default.patch()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      setSettingDefaultRoleId(null)
    },
  })

  const reorderMutation = useMutation({
    mutationFn: async ({ roleId, newPriority }: { roleId: string; newPriority: number }) => {
      const { error } = await api.admin.roles.reorder.patch({ roleId, newPriority })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] }),
    onError: () => setRoles(rolesData),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortableRoles.findIndex(r => r.roleId === active.id)
    const newIndex = sortableRoles.findIndex(r => r.roleId === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newSortableRoles = arrayMove(sortableRoles, oldIndex, newIndex)
    const nonSortableRoles = roles.filter(r => r.priority >= userPriority)
    setRoles([...nonSortableRoles, ...newSortableRoles])

    const targetRole = sortableRoles[oldIndex]!
    const newPriorityInFullList = roles.length - 1 - (nonSortableRoles.length + newIndex)

    reorderMutation.mutate({ roleId: targetRole.roleId, newPriority: newPriorityInFullList })
  }

  const sharedCardProps = {
    permissions,
    onDelete: (roleId: string) => setDeletingRoleId(roleId),
    onSetDefault: (roleId: string) => setSettingDefaultRoleId(roleId),
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard value={roles.length} label="Total Roles" />
        <StatCard value={permissions.length} label="Available Permissions" />
        <StatCard value={roles.reduce((sum, r) => sum + (r.userCount || 0), 0)} label="Total Users with Roles" />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        {roles.filter(r => r.priority >= userPriority).map((role) => (
          <SortableRoleCard
            key={role.roleId}
            role={role}
            {...sharedCardProps}
            isPendingDelete={false}
            isPendingSetDefault={false}
            canEdit={false}
          />
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableRoles.map(r => r.roleId)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 gap-6">
            {sortableRoles.map((role) => (
              <SortableRoleCard
                key={role.roleId}
                role={role}
                {...sharedCardProps}
                isPendingDelete={deleteRoleMutation.isPending && deleteRoleMutation.variables === role.roleId}
                isPendingSetDefault={setDefaultMutation.isPending && setDefaultMutation.variables === role.roleId}
                canEdit={true}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={deletingRoleId !== null}
        title="Delete role?"
        description="This will permanently remove this role. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteRoleMutation.mutateAsync(deletingRoleId!)}
        onClose={() => setDeletingRoleId(null)}
      />

      <ConfirmDialog
        open={settingDefaultRoleId !== null}
        title="Set as default role?"
        description="New users will be assigned this role automatically. The current default role will no longer be the default."
        confirmLabel="Set as Default"
        onConfirm={() => setDefaultMutation.mutateAsync(settingDefaultRoleId!)}
        onClose={() => setSettingDefaultRoleId(null)}
      />
    </>
  )
}
