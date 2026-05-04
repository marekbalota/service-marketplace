import { useState } from 'react'
import { wrapEdenError } from '#/lib/api-error'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { StarRatingInput } from '#/components/StarRatingInput'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { FieldError } from '#/components/ui/field'
import { api } from '#/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useActiveProfile } from '#/context/activeProfile'

const reviewSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  description: z.string().max(500).optional(),
})

type ReviewFormData = z.infer<typeof reviewSchema>

interface ReviewFormProps {
  postId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ReviewForm({ postId, onSuccess, onCancel }: ReviewFormProps) {
  const queryClient = useQueryClient()
  const { activeProfile } = useActiveProfile()
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, description: '' },
  })

  const mutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      if (!activeProfile?.userProfileId) throw new Error('No active profile selected')
      const { error, data: result } = await api.reviews.post({
        rating: data.rating,
        reviewDescription: data.description || null,
        postId,
        profileId: activeProfile.userProfileId,
      })
      if (error) throw wrapEdenError(error, 'Failed to submit review.')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      onSuccess()
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const onSubmit = (data: ReviewFormData) => {
    setError(null)
    mutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Your Rating *</Label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <StarRatingInput
              value={field.value}
              onChange={field.onChange}
              disabled={mutation.isPending}
            />
          )}
        />
        <FieldError errors={[errors.rating]} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Review (Optional)</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="description"
              placeholder="Share your experience..."
              maxLength={500}
              disabled={mutation.isPending}
              {...field}
              value={field.value || ''}
            />
          )}
        />
        <FieldError errors={[errors.description]} />
      </div>

      <FieldError errors={[error ? { message: error } : undefined]} />

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Submitting...' : 'Submit Review'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
