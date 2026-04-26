import type { Dispatch, SetStateAction } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
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
import type { NewRoleState } from './CreateRoleButton'

interface RolesContentProps {
  editingRole: Role | null
  setEditingRole: (role: Role | null) => void
  newRole: NewRoleState
  setNewRole: Dispatch<SetStateAction<NewRoleState>>
  userPriority: number
}

export function RolesContent({ editingRole, setEditingRole, newRole, setNewRole, userPriority }: RolesContentProps) {
  const { data: rolesData = [] } = useSuspenseQuery(rolesQueryOptions)
  const { data: permissions = [] } = useSuspenseQuery(permissionsQueryOptions)
  const queryClient = useQueryClient()

  const [roles, setRoles] = useState<Role[]>(rolesData)
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)
  const sortableRoles = roles.filter(r => r.priority < userPriority)

  useEffect(() => {
    setRoles(rolesData)
  }, [rolesData])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
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

    try {
      await api.admin.roles.reorder.patch({ roleId: targetRole.roleId, newPriority: newPriorityInFullList })
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
    } catch (error) {
      setRoles(roles)
      console.error('Failed to reorder role:', error)
    }
  }, [sortableRoles, roles, queryClient, userPriority])

  const togglePermission = (permissionId: string) => {
    setNewRole((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((p) => p !== permissionId)
        : [...prev.permissionIds, permissionId],
    }))
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setNewRole({ name: role.name, description: role.description ?? '', permissionIds: role.permissions })
  }

  const handleUpdateRole = async () => {
    if (!editingRole) return
    await api.admin.roles({ id: editingRole.roleId }).patch({
      name: newRole.name,
      description: newRole.description,
      permissionIds: newRole.permissionIds,
    })
    setEditingRole(null)
    setNewRole({ name: '', description: '', permissionIds: [] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
  }

  const handleDeleteRole = (roleId: string) => {
    setDeletingRoleId(roleId)
  }

  const doDeleteRole = async () => {
    if (!deletingRoleId) return
    await api.admin.roles({ id: deletingRoleId }).delete()
    queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
    setDeletingRoleId(null)
  }

  const getRoleColor = (isDefault: boolean) =>
    isDefault ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'

  const sharedCardProps = { editingRole, setEditingRole, newRole, setNewRole, onEdit: handleEditRole, onDelete: handleDeleteRole, onUpdateRole: handleUpdateRole, togglePermission, getRoleColor }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard value={roles.length} label="Total Roles" />
        <StatCard value={permissions.length} label="Available Permissions" />
        <StatCard value={roles.reduce((sum, r) => sum + (r.userCount || 0), 0)} label="Total Users with Roles" />
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        {roles.filter(r => r.priority >= userPriority).map((role) => (
          <SortableRoleCard key={role.roleId} role={role} permissions={permissions} {...sharedCardProps} canReorder={false} />
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableRoles.map(r => r.roleId)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 gap-6">
            {sortableRoles.map((role) => (
              <SortableRoleCard key={role.roleId} role={role} permissions={permissions} {...sharedCardProps} canReorder={true} />
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
        onConfirm={doDeleteRole}
        onClose={() => setDeletingRoleId(null)}
      />
    </>
  )
}
