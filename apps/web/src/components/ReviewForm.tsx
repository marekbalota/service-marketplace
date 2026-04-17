import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { StarRatingInput } from './StarRatingInput'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Label } from '#/components/ui/label'
import { api } from '#/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
      const { error, data: result } = await api.posts({ id: postId }).reviews.post({
        rating: data.rating,
        reviewDescription: data.description || null,
      })
      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', postId] })
      onSuccess()
    },
    onError: (err: { message?: string; status?: number }) => {
      if (err.status === 409) {
        setError('You have already reviewed this post')
      } else {
        setError(err.message || 'Failed to submit review')
      }
    },
  })

  const onSubmit = (data: ReviewFormData) => {
    setError(null)
    mutation.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border bg-card p-4">
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
        {errors.rating && (
          <p className="text-sm text-destructive">{errors.rating.message}</p>
        )}
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
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

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
