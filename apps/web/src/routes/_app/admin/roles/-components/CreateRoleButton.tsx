import type { Dispatch, SetStateAction } from 'react'
import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Plus, Loader2 } from 'lucide-react'
import { api } from '#/api'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Checkbox } from '#/components/ui/checkbox'
import { permissionsQueryOptions } from '../-queries/admin'

export type NewRoleState = { name: string; description: string; permissionIds: string[] }

interface CreateRoleButtonProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  newRole: NewRoleState
  setNewRole: Dispatch<SetStateAction<NewRoleState>>
}

export function CreateRoleButton({ isOpen, setIsOpen, newRole, setNewRole }: CreateRoleButtonProps) {
  const queryClient = useQueryClient()
  const { data: permissions = [] } = useSuspenseQuery(permissionsQueryOptions)

  const togglePermission = (permissionId: string) => {
    setNewRole((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((p) => p !== permissionId)
        : [...prev.permissionIds, permissionId],
    }))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.admin.roles.post({
        name: newRole.name,
        description: newRole.description,
        permissionIds: newRole.permissionIds,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setIsOpen(false)
      setNewRole({ name: '', description: '', permissionIds: [] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        Create Role
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>Define a new role with specific permissions</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Role Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Content Manager"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="Brief description of this role"
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
                    id={permission.permissionId}
                    checked={newRole.permissionIds.includes(permission.permissionId)}
                    onCheckedChange={() => togglePermission(permission.permissionId)}
                  />
                  <div className="flex-1">
                    <label htmlFor={permission.permissionId} className="text-sm font-medium cursor-pointer">
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
              onClick={() => { setIsOpen(false); setNewRole({ name: '', description: '', permissionIds: [] }) }}
              className="flex-1"
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !newRole.name || !newRole.description}
              className="flex-1"
            >
              {createMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Create Role
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
