import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  grantablePermissionIds: Set<string>
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
  grantablePermissionIds,
  defaultValues,
  onSubmit,
}: RoleDialogProps) {
  const { t } = useTranslation()
  const { control, handleSubmit, watch, setValue, reset, setError, formState } =
    useForm<RoleValues>({
      resolver: zodResolver(roleFormSchema),
      mode: 'onTouched',
      defaultValues: defaultValues ?? { name: '', description: '', permissionIds: [] as string[] },
    })

  useEffect(() => {
    if (open) reset(defaultValues ?? { name: '', description: '', permissionIds: [] as string[] })
  }, [open, reset, defaultValues])

  const permissionIds = watch('permissionIds')

  const togglePermission = (id: string) => {
    setValue(
      'permissionIds',
      permissionIds.includes(id) ? permissionIds.filter((p) => p !== id) : [...permissionIds, id],
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Label htmlFor="role-name">{t('admin.roles.roleName')} *</Label>
                <Input
                  {...field}
                  id="role-name"
                  placeholder={t('admin.roles.roleNamePlaceholder')}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Label htmlFor="role-description">{t('admin.roles.descriptionLabel')} *</Label>
                <Input
                  {...field}
                  id="role-description"
                  placeholder={t('admin.roles.descriptionPlaceholder')}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <div className="space-y-3">
            <Label>{t('admin.roles.permissionsSection')}</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
              {permissions.map((permission) => {
                const grantable = grantablePermissionIds.has(permission.permissionId)
                return (
                  <div key={permission.permissionId} className="flex items-start space-x-3">
                    <Checkbox
                      id={`role-form-${permission.permissionId}`}
                      checked={permissionIds.includes(permission.permissionId)}
                      disabled={!grantable}
                      className={grantable ? 'cursor-pointer' : 'cursor-not-allowed'}
                      onCheckedChange={() => {
                        if (grantable) togglePermission(permission.permissionId)
                      }}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`role-form-${permission.permissionId}`}
                        className={grantable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                      >
                        {permission.description ?? permission.name}
                      </Label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <FieldError errors={[formState.errors.root]} />
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset({ name: '', description: '', permissionIds: [] as string[] })
                onOpenChange(false)
              }}
              className="flex-1"
              disabled={formState.isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={formState.isSubmitting || !formState.isValid}
              className="flex-1"
            >
              {formState.isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
