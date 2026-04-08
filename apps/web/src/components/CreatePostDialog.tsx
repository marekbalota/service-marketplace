import { useState } from 'react'
import { useForm, Controller, useWatch, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api'
import { categoriesQueryOptions } from '#/routes/index'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Plus } from 'lucide-react'

// Zod schema — single source of truth for form validation (Seminar 07 pattern)
const createPostSchema = z.object({
  postTitle: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  postType: z.enum(['OFFER', 'REQUEST']),
  hasPrice: z.boolean(),
  price: z.string().optional(),
  rateType: z.enum(['HOURLY', 'DAILY', 'FIXED']).optional(),
  categoryIds: z.array(z.string()),
}).refine(
  (data) => {
    if (data.hasPrice && (!data.price || parseFloat(data.price) <= 0)) return false
    return true
  },
  { message: 'Price must be a positive number', path: ['price'] },
).refine(
  (data) => {
    if (data.hasPrice && !data.rateType) return false
    return true
  },
  { message: 'Rate type is required when price is set', path: ['rateType'] },
)

type CreatePostForm = z.infer<typeof createPostSchema>

export function CreatePostDialog({ authorId }: { authorId: string }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: categories = [] } = useQuery(categoriesQueryOptions)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreatePostForm>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      postTitle: '',
      description: '',
      postType: 'OFFER',
      hasPrice: false,
      price: '',
      rateType: undefined,
      categoryIds: [],
    },
  })

  // useWatch isolates re-renders to just this check (Seminar 07: useWatch vs watch)
  const hasPrice = useWatch({ control, name: 'hasPrice' })

  const mutation = useMutation({
    mutationFn: async (values: CreatePostForm) => {
      const { hasPrice: hp, ...rest } = values
      const { data, error } = await api.posts.post({
        authorId,
        postTitle: rest.postTitle,
        description: rest.description,
        postType: rest.postType,
        price: hp && rest.price ? rest.price : null,
        rateType: hp && rest.rateType ? rest.rateType : null,
        categoryIds: rest.categoryIds.length > 0 ? rest.categoryIds : undefined,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate posts cache so lists refresh (TanStack Query pattern from Seminar 04)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      reset()
      setOpen(false)
    },
  })

  const onSubmit: SubmitHandler<CreatePostForm> = (values) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Create Posting
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a New Posting</DialogTitle>
          <DialogDescription>
            Fill in the details for your service offer or request.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-post-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="postTitle">Title *</Label>
            <Input
              id="postTitle"
              placeholder="e.g. Math Tutoring — High School"
              aria-invalid={!!errors.postTitle}
              {...register('postTitle')}
            />
            {errors.postTitle && (
              <p className="text-sm text-destructive">{errors.postTitle.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your service in detail..."
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Post Type — Controller pattern for controlled select (Seminar 07) */}
          <div className="space-y-1.5">
            <Label htmlFor="postType">Type *</Label>
            <Controller
              name="postType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="postType">
                    <SelectValue>
                      {field.value === 'OFFER' ? 'Offering a Service' : 'Requesting a Service'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFER">Offering a Service</SelectItem>
                    <SelectItem value="REQUEST">Requesting a Service</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Category — Controller for multi-value (simplified to single for now) */}
          <div className="space-y-1.5">
            <Label htmlFor="categoryIds">Category</Label>
            <Controller
              name="categoryIds"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value[0] ?? ''}
                  onValueChange={(v) => field.onChange(v ? [v] : [])}
                >
                  <SelectTrigger id="categoryIds">
                    <SelectValue>
                      {field.value[0]
                        ? (categories.find((c) => c.categoryId === field.value[0])?.name ?? 'Select...')
                        : 'Select a category'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.categoryId} value={cat.categoryId}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Has Price — conditional field rendering (Seminar 07: watch/useWatch) */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasPrice"
              className="size-4 rounded border accent-primary"
              {...register('hasPrice')}
            />
            <Label htmlFor="hasPrice">Set a price</Label>
          </div>

          {hasPrice && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  aria-invalid={!!errors.price}
                  {...register('price')}
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rateType">Rate Type *</Label>
                <Controller
                  name="rateType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="rateType" aria-invalid={!!errors.rateType}>
                        <SelectValue>
                          {field.value === 'HOURLY' ? 'Per Hour' : field.value === 'DAILY' ? 'Per Day' : field.value === 'FIXED' ? 'Fixed Price' : 'Select...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOURLY">Per Hour</SelectItem>
                        <SelectItem value="DAILY">Per Day</SelectItem>
                        <SelectItem value="FIXED">Fixed Price</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.rateType && (
                  <p className="text-sm text-destructive">{errors.rateType.message}</p>
                )}
              </div>
            </div>
          )}

          {mutation.isError && (
            <p className="text-sm text-destructive">
              Failed to create posting. Please try again.
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="submit"
            form="create-post-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Posting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
