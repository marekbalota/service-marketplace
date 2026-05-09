import { createFileRoute, useRouter, redirect, useBlocker } from '@tanstack/react-router'
import { wrapEdenError } from '#/lib/api-error'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, AlignLeft, Tag } from 'lucide-react'
import { FieldIconHeader } from '#/components/FieldIconHeader'
import { PostTypeToggle } from '#/components/PostTypeToggle'
import { useEffect } from 'react'
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
import { Field, FieldError } from '#/components/ui/field'
import { Permissions, hasPermissions } from '@marketplace/shared'
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
  beforeLoad: async ({ context: { user, queryClient }, params: { postId }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
    if (!hasPermissions(user.role?.permissions ?? [], [Permissions.PostsEditOwn]))
      throw redirect({ to: '/' })
    const post = await queryClient.ensureQueryData(postDetailQueryOptions(postId))
    const isOwner = user.profiles.some((p) => p.userProfileId === post.authorId)
    if (!isOwner) throw redirect({ to: '/posts/$postId', params: { postId } })
  },
  loader: async ({ context: { queryClient }, params: { postId } }) => {
    await Promise.all([
      queryClient.ensureQueryData(postDetailQueryOptions(postId)),
      queryClient.ensureQueryData(categoriesQueryOptions),
    ])
  },
  pendingComponent: EditPostSkeleton,
  component: EditPostPage,
})

function EditPostSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Skeleton className="mb-4 h-9 w-20" />
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-11 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-11 w-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>
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

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => isDirty,
    withResolver: true,
  })

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
    onError: (error) => form.setError('root', { message: error.message }),
  })

  const onSubmit: SubmitHandler<FormValues> = (values) => mutation.mutate(values)

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <BackButton onClick={() => router.history.back()} />

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl">Edit Posting</CardTitle>
          <CardDescription className="text-base">
            Update your service posting details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <PostTypeToggle control={form.control} />

            <Controller
              control={form.control}
              name="postTitle"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldIconHeader icon={FileText} iconBgClassName="bg-blue-100 dark:bg-blue-500/20" iconClassName="text-blue-600 dark:text-blue-300" label="Title *" htmlFor="postTitle" />
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
                  <FieldIconHeader icon={AlignLeft} iconBgClassName="bg-muted" iconClassName="text-muted-foreground" label="Description *" htmlFor="description" />
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
                  <FieldIconHeader icon={Tag} iconBgClassName="bg-green-100 dark:bg-green-500/20" iconClassName="text-green-600 dark:text-green-300" label="Categories (Optional)" />
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

            <FieldError errors={[form.formState.errors.root]} />

            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.history.back()}
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
        open={status === 'blocked'}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to leave?"
        confirmLabel="Discard"
        destructive
        onConfirm={() => proceed?.()}
        onClose={() => reset?.()}
      />
    </main>
  )
}
