import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { authClient } from '#/auth'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { parseAuthErrorBody } from '#/lib/api-error'

const schema = z.object({
  newEmail: z.email('Please enter a valid email'),
})

type FormValues = z.infer<typeof schema>

export function ChangeEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newEmail: '' },
    mode: 'onTouched',
  })

  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  const onSubmit: SubmitHandler<FormValues> = async ({ newEmail }) => {
    const { error } = await authClient.changeEmail({ newEmail })
    if (error) {
      const body = parseAuthErrorBody(error)
      form.setError('root', {
        message: (body?.message as string) ?? error.message ?? 'An unexpected error occurred',
      })
      return
    }
    handleOpenChange(false)
    toast.success("Check your inbox — we've sent a confirmation link to your current email.")
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
          <DialogDescription>Update your account email address.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="newEmail"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="new-email">New Email</FieldLabel>
                  <Input
                    {...field}
                    id="new-email"
                    type="email"
                    placeholder="new@example.com"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
          <FieldError errors={[form.formState.errors.root]} />
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isValid}>
              {form.formState.isSubmitting ? 'Sending…' : 'Change Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
