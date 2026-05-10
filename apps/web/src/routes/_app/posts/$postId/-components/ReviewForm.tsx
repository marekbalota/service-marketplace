import { useState, useRef, useEffect } from 'react'
import { wrapEdenError } from '#/lib/api-error'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
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
import { ImagePickerGrid } from '#/components/ImagePickerGrid'

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

  // Image state — same pattern as profile create/edit
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([])
  const pendingFilesRef = useRef(pendingFiles)
  useEffect(() => { pendingFilesRef.current = pendingFiles }, [pendingFiles])
  useEffect(() => () => {
    for (const { preview } of pendingFilesRef.current) URL.revokeObjectURL(preview)
  }, [])

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, description: '' },
    mode: 'onTouched',
  })

  const mutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      if (!activeProfile?.userProfileId) throw new Error('No active profile selected')

      // Step 1: Create the review
      const { error: reviewError, data: result } = await api.reviews.post({
        rating: data.rating,
        reviewDescription: data.description || null,
        postId,
        profileId: activeProfile.userProfileId,
      })
      if (reviewError) throw wrapEdenError(reviewError, 'Failed to submit review.')

      // Step 2: Upload images in parallel (best-effort — review is already created)
      const uploadResults = await Promise.all(
        pendingFilesRef.current.map(async ({ file }) => {
          try {
            const { error } = await api['review-images'].post({ file, reviewId: result!.reviewId })
            return !error
          } catch {
            return false
          }
        })
      )
      const imageFailCount = uploadResults.filter(success => !success).length

      return { imageFailCount }
    },
    onSuccess: ({ imageFailCount }) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      for (const { preview } of pendingFilesRef.current) URL.revokeObjectURL(preview)
      setPendingFiles([])
      if (imageFailCount > 0) {
        setError(`Review submitted, but ${imageFailCount} image(s) failed to upload.`)
      }
      onSuccess()
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  function addFile(file: File) {
    const preview = URL.createObjectURL(file)
    setPendingFiles(prev => [...prev, { file, preview }])
  }

  function removeFile(index: number) {
    const preview = pendingFiles[index]?.preview
    if (preview) URL.revokeObjectURL(preview)
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit: SubmitHandler<ReviewFormData> = (data) => {
    setError(null)
    mutation.mutate(data)
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg border bg-card p-4">
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

      <div className="space-y-2">
        <Label>Images (Optional)</Label>
        <ImagePickerGrid
          previews={pendingFiles.map(f => f.preview)}
          onFilePicked={addFile}
          onRemove={removeFile}
        />
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
