import { createFileRoute, useRouter, redirect, useBlocker } from '@tanstack/react-router'
import { useLocale } from '#/lib/useLocale'
import { wrapEdenError } from '#/lib/api-error'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { api } from '#/api'
import { categoriesQueryOptions, postDetailQueryOptions } from '#/lib/queries/posts'
import { BackButton } from '#/components/BackButton'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { FieldError } from '#/components/ui/field'
import { PostTypeToggle } from '#/components/PostTypeToggle'
import { PricingField } from '#/components/PricingField'
import { PostTitleField } from '#/components/PostTitleField'
import { PostCategoryField } from '#/components/PostCategoryField'
import { PostDescriptionField } from '#/components/PostDescriptionField'
import { Permissions, hasPermissions } from '@marketplace/shared'

const schema = z.object({
  postType: z.enum(['OFFER', 'REQUEST']),
  postTitle: z.string().min(3),
  description: z.string().min(10),
  categoryIds: z.array(z.string()),
  price: z.string().optional(),
  rateType: z.enum(['HOURLY', 'DAILY', 'FIXED']).optional(),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute('/$locale/_app/edit-post/$postId')({
  beforeLoad: async ({ context: { user, queryClient }, params, location }) => {
    const { postId } = params
    if (!user) throw redirect({ to: '/$locale/login', params, search: { redirect: location.href }, replace: true })
    if (!hasPermissions(user.role?.permissions ?? [], [Permissions.PostsEditOwn]))
      throw redirect({ to: '/$locale/posts', params })
    const post = await queryClient.ensureQueryData(postDetailQueryOptions(postId, params.locale as string))
    const isOwner = user.profiles.some((p) => p.userProfileId === post.authorId)
    if (!isOwner) throw redirect({ to: '/$locale/posts/$postId', params })
  },
  loader: async ({ context: { queryClient }, params }) => {
    const { postId, locale } = params as { postId: string; locale: string }
    await Promise.all([
      queryClient.ensureQueryData(postDetailQueryOptions(postId, locale)),
      queryClient.ensureQueryData(categoriesQueryOptions(locale)),
    ])
  },
  pendingComponent: EditPostSkeleton,
  component: EditPostPage,
})

function EditPostSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="mb-4 h-9 w-20" />
      <Card className="border-0 shadow-lg pt-0">
        <CardHeader className="flex flex-col rounded-t-xl px-6 pt-4 pb-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-4">
            {/* Row 1 skeleton: Post Type */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-11 w-full" />
            </div>
            {/* Row 2 skeleton: Title | Category */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-11 w-full" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
            {/* Row 3 skeleton: Pricing */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
            {/* Row 4 skeleton: Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-[220px] w-full" />
            </div>
            {/* Buttons skeleton */}
            <div className="flex gap-3 pt-2">
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
  const { t } = useTranslation()
  const { postId } = Route.useParams()
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: post } = useSuspenseQuery(postDetailQueryOptions(postId, locale))
  const { data: categories = [] } = useSuspenseQuery(categoriesQueryOptions(locale))

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      postType: post.postType as 'OFFER' | 'REQUEST',
      postTitle: post.postTitle,
      description: post.description,
      categoryIds: post.categories.map((c) => c.categoryId),
      price: post.price ?? '',
      rateType: (post.rateType ?? undefined) as 'HOURLY' | 'DAILY' | 'FIXED' | undefined,
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
        postTitle: values.postTitle,
        description: values.description,
        postType: values.postType,
        categoryIds: values.categoryIds,
        price: values.price || null,
        rateType: values.rateType ?? null,
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
    <main className="mx-auto max-w-7xl px-4 py-6">
      <BackButton onClick={() => router.history.back()} />

      <Card className="border-0 shadow-lg pt-0">
        <CardHeader className="flex flex-col rounded-t-xl px-6 pt-4 pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <CardTitle className="text-lg">{t('editPost.title')}</CardTitle>
          <CardDescription className="text-sm">{t('editPost.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Row 1: Post Type — full width */}
            <PostTypeToggle control={form.control} />

            {/* Row 2: Title | Category */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PostTitleField control={form.control} />
              <PostCategoryField control={form.control} categories={categories} />
            </div>

            {/* Row 3: Pricing — full width (price | rate type side-by-side internally) */}
            <PricingField control={form.control} priceValue={priceValue} />

            {/* Row 4: Description — full width, stretched */}
            <PostDescriptionField control={form.control} />

            <FieldError errors={[form.formState.errors.root]} />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.history.back()}
                className="h-11 flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !isValid}
                className="h-11 flex-1"
              >
                {mutation.isPending ? t('editPost.submitting') : t('editPost.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={status === 'blocked'}
        title={t('editPost.discardTitle')}
        description={t('editPost.discardMessage')}
        confirmLabel={t('editPost.discard')}
        destructive
        onConfirm={() => proceed?.()}
        onClose={() => reset?.()}
      />
    </main>
  )
}
