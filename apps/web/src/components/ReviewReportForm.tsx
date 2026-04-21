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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const reviewReportSchema = z.object({
  categoryId: z.string().uuid('Please select a category'),
  description: z.string().max(1000).optional(),
})

type ReviewReportFormData = z.infer<typeof reviewReportSchema>

interface ReviewReportFormProps {
  reviewId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ReviewReportForm({ reviewId, onSuccess, onCancel }: ReviewReportFormProps) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['report-categories', 'REVIEW'],
    queryFn: async () => {
      const { data, error } = await api['report-categories'].get({ query: { targetType: 'REVIEW' } })
      if (error) throw error
      return data!
    },
  })

  const { control, handleSubmit } = useForm<ReviewReportFormData>({
    resolver: zodResolver(reviewReportSchema),
    mode: 'onTouched',
    defaultValues: { description: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: ReviewReportFormData) => {
      const { error } = await api.reviews({ id: reviewId }).reports.post({
        categoryId: data.categoryId,
        description: data.description,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'check', 'review', reviewId] })
      onSuccess()
    },
    onError: (err: { message?: string; status?: number }) => {
      if (err.status === 409) {
        setServerError('You have already reported this review')
      } else {
        setServerError(err.message || 'Failed to submit report')
      }
    },
  })

  const onSubmit: SubmitHandler<ReviewReportFormData> = (data) => {
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
          name="categoryId"
          control={control}
          render={({ field, fieldState }) => {
            const selectedLabel = categories.find(c => c.categoryId === field.value)?.label
            return (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Report Category *</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v)
                  field.onBlur()
                }}
                disabled={mutation.isPending || categoriesLoading}
              >
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder={categoriesLoading ? 'Loading...' : 'Select a reason...'}>
                    {selectedLabel}
                  </SelectValue>               
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.categoryId} value={cat.categoryId}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )  
          }}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                placeholder="Provide any additional details..."
                maxLength={1000}
                rows={3}
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
          disabled={mutation.isPending || categoriesLoading}
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
