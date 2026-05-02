import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Checkbox } from '#/components/ui/checkbox'
import { Field, FieldError } from '#/components/ui/field'
import type { Permission } from './SortableRoleCard'

const roleFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  permissionIds: z.array(z.string()),
})

export type RoleValues = z.infer<typeof roleFormSchema>

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  permissions: Permission[]
  defaultValues?: RoleValues
  onSubmit: (values: RoleValues) => Promise<void>
}

export function RoleDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  permissions,
  defaultValues,
  onSubmit,
}: RoleDialogProps) {
  const { register, handleSubmit, watch, setValue, reset, setError, formState } = useForm<RoleValues>({
    resolver: zodResolver(roleFormSchema),
    mode: 'onTouched',
    defaultValues: defaultValues ?? { name: '', description: '', permissionIds: [] as string[] },
  })

  useEffect(() => {
    if (open) reset(defaultValues ?? { name: '', description: '', permissionIds: [] as string[] })
  }, [open, reset])

  const permissionIds = watch('permissionIds')

  const togglePermission = (id: string) => {
    setValue('permissionIds',
      permissionIds.includes(id) ? permissionIds.filter(p => p !== id) : [...permissionIds, id],
    )
  }

  const handleFormSubmit: SubmitHandler<RoleValues> = async (values) => {
    try {
      await onSubmit(values)
    } catch {
      setError('root', { message: `Failed to ${submitLabel.toLowerCase()}. Please try again.` })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset({ name: '', description: '', permissionIds: [] as string[] }) }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
          <Field data-invalid={!!formState.errors.name}>
            <Label htmlFor="role-name">Role Name *</Label>
            <Input
              id="role-name"
              placeholder="e.g., Content Manager"
              aria-invalid={!!formState.errors.name}
              {...register('name')}
            />
            <FieldError errors={[formState.errors.name]} />
          </Field>
          <Field data-invalid={!!formState.errors.description}>
            <Label htmlFor="role-description">Description *</Label>
            <Input
              id="role-description"
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
                    id={`role-form-${permission.permissionId}`}
                    checked={permissionIds.includes(permission.permissionId)}
                    onCheckedChange={() => togglePermission(permission.permissionId)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`role-form-${permission.permissionId}`}
                      className="text-sm font-medium cursor-pointer"
                    >
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
              onClick={() => { reset({ name: '', description: '', permissionIds: [] as string[] }); onOpenChange(false) }}
              className="flex-1"
              disabled={formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting} className="flex-1">
              {formState.isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
