import { Loader2 } from 'lucide-react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '#/components/ui/dialog'
import { Field, FieldError } from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

const banFormSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
  durationType: z.enum(['permanent', 'until-date']),
  expiresAt: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.durationType === 'until-date') {
    if (!data.expiresAt) {
      ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry date is required' })
    } else if (new Date(data.expiresAt) <= new Date()) {
      ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry date must be in the future' })
    }
  }
})

type BanFormValues = z.infer<typeof banFormSchema>

const durationLabels: Record<string, string> = {
  permanent: 'Permanent',
  'until-date': 'Until date',
}

export function BanDialog({
  open,
  userName,
  onSubmit,
  onClose,
}: {
  open: boolean
  userName: string
  onSubmit: (reason: string, expiresAt?: Date) => Promise<void>
  onClose: () => void
}) {
  const { control, handleSubmit, watch, reset, formState } = useForm<BanFormValues>({
    resolver: zodResolver(banFormSchema),
    mode: 'onTouched',
    defaultValues: { reason: '', durationType: 'permanent', expiresAt: '' },
  })

  const durationType = watch('durationType')

  const submit: SubmitHandler<BanFormValues> = async (values) => {
    const expiresAt =
      values.durationType === 'until-date' && values.expiresAt
        ? new Date(values.expiresAt)
        : undefined
    await onSubmit(values.reason, expiresAt)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {userName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <Controller
            control={control}
            name="reason"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <label className="text-sm font-medium">Reason *</label>
                <Textarea
                  {...field}
                  aria-invalid={fieldState.invalid}
                  placeholder="Describe the reason for this ban..."
                  rows={3}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="durationType"
            render={({ field }) => (
              <Field>
                <label className="text-sm font-medium">Duration</label>
                <Select value={field.value} onValueChange={(v) => { field.onChange(v); field.onBlur() }}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{durationLabels[field.value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(durationLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          {durationType === 'until-date' && (
            <Controller
              control={control}
              name="expiresAt"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <label className="text-sm font-medium">Expiry date</label>
                  <Input
                    {...field}
                    type="date"
                    aria-invalid={fieldState.invalid}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Ban User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
