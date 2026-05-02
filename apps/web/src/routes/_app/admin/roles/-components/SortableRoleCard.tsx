import type { Dispatch, SetStateAction } from 'react'
import { Edit, Trash2, GripVertical, Star } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '#/components/ui/dialog'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Checkbox } from '#/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import type { NewRoleState } from './CreateRoleButton'

export type Role = { roleId: string; name: string; description: string | null; isDefault: boolean; permissions: string[]; userCount: number; priority: number }
export type Permission = { permissionId: string; name: string; description: string | null }

interface SortableRoleCardProps {
  role: Role
  permissions: Permission[]
  editingRole: Role | null
  setEditingRole: (role: Role | null) => void
  newRole: NewRoleState
  setNewRole: Dispatch<SetStateAction<NewRoleState>>
  onEdit: (role: Role) => void
  onDelete: (roleId: string) => void
  onSetDefault: (roleId: string) => void
  onUpdateRole: () => void
  togglePermission: (permissionId: string) => void
  getRoleColor: (isDefault: boolean) => string
  canReorder: boolean
}

export function SortableRoleCard({
  role,
  permissions,
  editingRole,
  setEditingRole,
  newRole,
  setNewRole,
  onEdit,
  onDelete,
  onSetDefault,
  onUpdateRole,
  togglePermission,
  getRoleColor,
  canReorder,
}: SortableRoleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.roleId, disabled: !canReorder })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group">
      <Card className="relative overflow-hidden">
        {canReorder && (
          <button
            className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-10 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted cursor-grab active:cursor-grabbing transition-all duration-200 ease-out z-10"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
          >
            <GripVertical className="size-5 text-muted-foreground" />
          </button>
        )}
        <div className={canReorder ? "transition-all duration-200 ease-out group-hover:pl-10" : ""}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle>{role.name}</CardTitle>
                  {role.isDefault && (
                    <Badge className={getRoleColor(true)}>default</Badge>
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
                {canReorder && (
                  <>
                    <Dialog
                      open={editingRole?.roleId === role.roleId}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingRole(null)
                          setNewRole({ name: '', description: '', permissionIds: [] })
                        }
                      }}
                    >
                      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(role)} />}>
                        <Edit className="size-4" />
                        Edit
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Role</DialogTitle>
                          <DialogDescription>Modify role permissions and details</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Role Name *</Label>
                            <Input
                              id="edit-name"
                              value={newRole.name}
                              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-description">Description *</Label>
                            <Input
                              id="edit-description"
                              value={newRole.description}
                              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                            />
                          </div>
                          <div className="space-y-3">
                            <Label>Permissions</Label>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
                              {permissions.map((permission) => (
                                <div key={permission.permissionId} className="flex items-start space-x-3">
                                  <Checkbox
                                    id={`edit-${permission.permissionId}`}
                                    checked={newRole.permissionIds.includes(permission.permissionId)}
                                    onCheckedChange={() => togglePermission(permission.permissionId)}
                                  />
                                  <div className="flex-1">
                                    <label
                                      htmlFor={`edit-${permission.permissionId}`}
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      {permission.description ?? permission.name}
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="outline"
                              onClick={() => { setEditingRole(null); setNewRole({ name: '', description: '', permissionIds: [] }) }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={onUpdateRole}
                              disabled={!newRole.name || !newRole.description}
                              className="flex-1"
                            >
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    {!role.isDefault && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => onSetDefault(role.roleId)}
                        >
                          <Star className="size-4" />
                          Set as Default
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-red-600 hover:text-red-700"
                          onClick={() => onDelete(role.roleId)}
                        >
                          <Trash2 className="size-4" />
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
                  const perm = permissions.find(p => p.permissionId === permId)
                  return perm ? (
                    <Badge key={permId} variant="secondary">{perm.description ?? perm.name}</Badge>
                  ) : (
                    <Badge key={permId} variant="secondary">{permId}</Badge>
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
