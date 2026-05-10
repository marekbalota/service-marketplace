import { useState } from 'react'
import { wrapEdenError } from '#/lib/api-error'
import { Edit, Trash2, GripVertical, Star, Loader2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '#/api'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { RoleDialog, type RoleValues } from './RoleDialog'

export type Role = {
  roleId: string
  name: string
  description: string | null
  isDefault: boolean
  permissions: string[]
  userCount: number
  priority: number
}
export type Permission = { permissionId: string; name: string; description: string | null }

interface SortableRoleCardProps {
  role: Role
  permissions: Permission[]
  grantablePermissionIds: Set<string>
  onDelete: (roleId: string) => void
  onSetDefault: (roleId: string) => void
  canEdit: boolean
  isPendingDelete: boolean
  isPendingSetDefault: boolean
}

export function SortableRoleCard({
  role,
  permissions,
  grantablePermissionIds,
  onDelete,
  onSetDefault,
  canEdit,
  isPendingDelete,
  isPendingSetDefault,
}: SortableRoleCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: async ({ name, description, permissionIds }: RoleValues) => {
      const { error } = await api.admin
        .roles({ id: role.roleId })
        .patch({ name, description, permissionIds })
      if (error) throw wrapEdenError(error, 'Failed to update role.')
    },
    onSuccess: () => {
      setEditOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
    },
  })

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: role.roleId,
    disabled: !canEdit,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card className="relative overflow-hidden">
        {canEdit && (
          <button
            type="button"
            className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted cursor-grab active:cursor-grabbing transition-all duration-200 ease-out z-10"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-5 text-muted-foreground" />
          </button>
        )}
        <div className={canEdit ? 'transition-all duration-200 ease-out group-hover:pl-10' : ''}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle>{role.name}</CardTitle>
                  {role.isDefault && (
                    <Badge className="bg-purple-100 text-purple-800">default</Badge>
                  )}
                  {role.userCount > 0 && (
                    <Badge variant="outline">
                      {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <CardDescription>{role.description}</CardDescription>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setEditOpen(true)}
                    >
                      <Edit className="size-4" />
                      Edit
                    </Button>
                    <RoleDialog
                      open={editOpen}
                      onOpenChange={setEditOpen}
                      title="Edit Role"
                      description="Modify role permissions and details"
                      submitLabel="Save Changes"
                      permissions={permissions}
                      grantablePermissionIds={grantablePermissionIds}
                      defaultValues={{
                        name: role.name,
                        description: role.description ?? '',
                        permissionIds: role.permissions,
                      }}
                      onSubmit={(values) => updateMutation.mutateAsync(values)}
                    />
                    {!role.isDefault && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={isPendingSetDefault}
                          onClick={() => onSetDefault(role.roleId)}
                        >
                          {isPendingSetDefault ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Star className="size-4" />
                          )}
                          Set as Default
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                          disabled={isPendingDelete}
                          onClick={() => onDelete(role.roleId)}
                        >
                          {isPendingDelete ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Delete
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-sm font-medium mb-3">Permissions ({role.permissions.length})</p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.map((permId) => {
                  const perm = permissions.find((p) => p.permissionId === permId)
                  return perm ? (
                    <Badge key={permId} variant="secondary">
                      {perm.description ?? perm.name}
                    </Badge>
                  ) : (
                    <Badge key={permId} variant="secondary">
                      {permId}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}
