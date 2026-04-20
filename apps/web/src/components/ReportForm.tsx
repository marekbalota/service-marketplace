import { useState } from 'react'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flag } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field'
import { api } from '#/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harmful-language', label: 'Harmful Language' },
  { value: 'inappropriate-content', label: 'Inappropriate Content' },
  { value: 'scam', label: 'Scam or Fraud' },
  { value: 'misleading', label: 'Misleading Information' },
  { value: 'other', label: 'Other' },
] as const

const reportSchema = z.object({
  reason: z.enum(['spam', 'harmful-language', 'inappropriate-content', 'scam', 'misleading', 'other']),
  description: z.string().min(1, 'Description is required').max(1000),
})

type ReportFormData = z.infer<typeof reportSchema>

interface ReportFormProps {
  postId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ReportForm({ postId, onSuccess, onCancel }: ReportFormProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    mode: 'onTouched',
    defaultValues: { description: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      const { error } = await api.posts({ id: postId }).reports.post({
        reason: data.reason,
        description: data.description,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'check', postId] })
      onSuccess()
    },
    onError: (err: { message?: string; status?: number }) => {
      if (err.status === 409) {
        setServerError('You have already reported this post')
      } else {
        setServerError(err.message || 'Failed to submit report')
      }
    },
  })

  const onSubmit: SubmitHandler<ReportFormData> = (data) => {
    setServerError(null)
    mutation.mutate(data)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border border-destructive/30 bg-card p-4"
    >
      <FieldGroup>
        <Controller
          name="reason"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Report Category *</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v)
                  field.onBlur()
                }}
                disabled={mutation.isPending}
              >
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Description *</FieldLabel>
              <Textarea
                placeholder="Please provide details about why you're reporting this post..."
                maxLength={1000}
                rows={4}
                aria-invalid={fieldState.invalid}
                disabled={mutation.isPending}
                {...field}
                value={field.value ?? ''}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <Flag className="size-4" />
          {mutation.isPending ? 'Submitting...' : 'Submit Report'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
