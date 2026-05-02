import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2 } from 'lucide-react'
import { api } from '#/api'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldError } from '#/components/ui/field'
import { permissionsQueryOptions } from '../-queries/admin'

const createRoleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  permissionIds: z.array(z.string()).default([]),
})

type CreateRoleFormValues = z.infer<typeof createRoleSchema>

// Exported for use in the edit dialog (SortableRoleCard / RolesContent)
export type NewRoleState = { name: string; description: string; permissionIds: string[] }

interface CreateRoleButtonProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function CreateRoleButton({ isOpen, setIsOpen }: CreateRoleButtonProps) {
  const queryClient = useQueryClient()
  const { data: permissions = [] } = useSuspenseQuery(permissionsQueryOptions)

  const { register, handleSubmit, watch, setValue, reset, setError, formState } = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    mode: 'onTouched',
    defaultValues: { name: '', description: '', permissionIds: [] },
  })

  const permissionIds = watch('permissionIds')

  const togglePermission = (id: string) => {
    setValue('permissionIds',
      permissionIds.includes(id) ? permissionIds.filter(p => p !== id) : [...permissionIds, id],
    )
  }

  const createMutation = useMutation({
    mutationFn: async (values: CreateRoleFormValues) => {
      const { error } = await api.admin.roles.post({
        name: values.name,
        description: values.description,
        permissionIds: values.permissionIds,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setIsOpen(false)
      reset()
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
    },
  })

  const onSubmit: SubmitHandler<CreateRoleFormValues> = async (values) => {
    try {
      await createMutation.mutateAsync(values)
    } catch {
      setError('root', { message: 'Failed to create role. Please try again.' })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset() }}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        Create Role
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>Define a new role with specific permissions</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <Field data-invalid={!!formState.errors.name}>
            <Label htmlFor="name">Role Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Content Manager"
              aria-invalid={!!formState.errors.name}
              {...register('name')}
            />
            <FieldError errors={[formState.errors.name]} />
          </Field>
          <Field data-invalid={!!formState.errors.description}>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="Brief description of this role"
              aria-invalid={!!formState.errors.description}
              {...register('description')}
            />
            <FieldError errors={[formState.errors.description]} />
          </Field>
          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
              {permissions.map((permission) => (
                <div key={permission.permissionId} className="flex items-start space-x-3">
                  <Checkbox
                    id={permission.permissionId}
                    checked={permissionIds.includes(permission.permissionId)}
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
          {formState.errors.root && (
            <p className="text-sm text-destructive">{formState.errors.root.message}</p>
          )}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); setIsOpen(false) }}
              className="flex-1"
              disabled={formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formState.isSubmitting}
              className="flex-1"
            >
              {formState.isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              Create Role
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
