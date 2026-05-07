import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { wrapEdenError } from '#/lib/api-error'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, AlignLeft, Tag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '#/api'
import { categoriesQueryOptions, postDetailQueryOptions } from '#/lib/queries/posts'
import { BackButton } from '#/components/BackButton'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { MultiSelect } from '#/components/ui/multi-select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { Permissions, hasPermissions } from '@marketplace/shared'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { PricingField } from '#/components/PricingField'

const schema = z.object({
  postType:    z.enum(['OFFER', 'REQUEST']),
  postTitle:   z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryIds: z.array(z.string()),
  price:       z.string().optional(),
  rateType:    z.enum(['HOURLY', 'DAILY', 'FIXED']).optional(),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute('/_app/edit-post/$postId')({
  beforeLoad: ({ context: { user }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
    const canEdit = hasPermissions(user.role?.permissions ?? [], [Permissions.PostsEditOwn])
    if (!canEdit) throw redirect({ to: '/' })
  },
  loader: async ({ context: { queryClient, user }, params: { postId } }) => {
    const [post] = await Promise.all([
      queryClient.ensureQueryData(postDetailQueryOptions(postId)),
      queryClient.ensureQueryData(categoriesQueryOptions),
    ])
    const isOwner = user?.profiles.some((p) => p.userProfileId === post.authorId) ?? false
    if (!isOwner) throw redirect({ to: '/posts/$postId', params: { postId } })
  },
  pendingComponent: EditPostSkeleton,
  component: EditPostPage,
})

function EditPostSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Skeleton className="mb-4 h-9 w-24" />
      <div className="rounded-xl border-0 shadow-lg p-6 space-y-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-11 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </main>
  )
}

function EditPostPage() {
  const { postId } = Route.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: post } = useSuspenseQuery(postDetailQueryOptions(postId))
  const { data: categories = [] } = useSuspenseQuery(categoriesQueryOptions)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      postType:    post.postType as 'OFFER' | 'REQUEST',
      postTitle:   post.postTitle,
      description: post.description,
      categoryIds: post.categories.map((c) => c.categoryId),
      price:       post.price ?? '',
      rateType:    (post.rateType ?? undefined) as 'HOURLY' | 'DAILY' | 'FIXED' | undefined,
    },
  })

  const { isValid, isDirty } = form.formState
  const priceValue = form.watch('price')
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  const handleBack = () => {
    if (isDirty) setShowDiscardDialog(true)
    else router.history.back()
  }

  useEffect(() => {
    if (!priceValue) {
      form.setValue('rateType', undefined, { shouldValidate: true })
    }
  }, [priceValue, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body = {
        postTitle:   values.postTitle,
        description: values.description,
        postType:    values.postType,
        categoryIds: values.categoryIds,
        price:       values.price || null,
        rateType:    values.rateType ?? null,
      }
      const { data, error } = await api.posts({ id: postId }).patch(body)
      if (error) throw wrapEdenError(error, 'Failed to update post.')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', postId] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      router.history.back()
    },
  })

  const onSubmit: SubmitHandler<FormValues> = (values) => mutation.mutate(values)

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <BackButton onClick={handleBack} />

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl">Edit Posting</CardTitle>
          <CardDescription className="text-base">
            Update your service posting details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Controller
              control={form.control}
              name="postType"
              render={({ field }) => (
                <Field>
                  <FieldLabel className="text-base font-semibold">Type *</FieldLabel>
                  <ToggleGroup
                    value={field.value ? [field.value] : []}
                    onValueChange={(vals) => { const v = vals[vals.length - 1]; if (v) field.onChange(v) }}
                    className="grid grid-cols-2 overflow-hidden rounded-lg border p-0"
                  >
                    {(['OFFER', 'REQUEST'] as const).map((type) => (
                      <ToggleGroupItem
                        key={type}
                        value={type}
                        className={[
                          'h-11 rounded-none',
                          field.value === type
                            ? 'aria-pressed:bg-primary aria-pressed:text-primary-foreground'
                            : 'bg-background text-foreground hover:bg-muted',
                          type === 'OFFER' ? 'border-r' : '',
                        ].join(' ')}
                      >
                        {type === 'OFFER' ? 'Offering Service' : 'Requesting Service'}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="postTitle"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
                      <FileText className="size-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <FieldLabel htmlFor="postTitle" className="text-base font-semibold">Title *</FieldLabel>
                  </div>
                  <Input
                    {...field}
                    id="postTitle"
                    placeholder="e.g., Professional Lawn Care Service"
                    className="h-11"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <AlignLeft className="size-5 text-muted-foreground" />
                    </div>
                    <FieldLabel htmlFor="description" className="text-base font-semibold">Description *</FieldLabel>
                  </div>
                  <Textarea
                    {...field}
                    id="description"
                    placeholder="Describe your service offering or request in detail..."
                    rows={5}
                    className="resize-none"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="categoryIds"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-500/20">
                      <Tag className="size-5 text-green-600 dark:text-green-300" />
                    </div>
                    <FieldLabel className="text-base font-semibold">Categories (Optional)</FieldLabel>
                  </div>
                  <MultiSelect
                    options={categories.map((c) => ({ value: c.categoryId, label: c.name }))}
                    value={field.value}
                    onValueChange={(v) => { field.onChange(v); field.onBlur() }}
                    placeholder="Select categories"
                    searchPlaceholder="Search categories..."
                    searchable
                    displayMode="tags"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <PricingField control={form.control} priceValue={priceValue} />

            {mutation.isError && (
              <FieldError errors={[{ message: mutation.error?.message }]} />
            )}

            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="h-11 flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !isValid}
                className="h-11 flex-1"
              >
                {mutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDiscardDialog}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to leave?"
        confirmLabel="Discard"
        destructive
        onConfirm={() => router.history.back()}
        onClose={() => setShowDiscardDialog(false)}
      />
    </main>
  )
}
