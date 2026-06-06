import { useTranslation } from 'react-i18next'
import { createFileRoute, useNavigate, redirect, useRouter } from '@tanstack/react-router'
import { useLocale } from '#/lib/useLocale'
import { wrapEdenError } from '#/lib/api-error'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { api } from '#/api'
import { categoriesQueryOptions } from '#/lib/queries/posts'
import { BackButton } from '#/components/BackButton'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { FieldError } from '#/components/ui/field'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { PostTypeToggle } from '#/components/PostTypeToggle'
import { PricingField } from '#/components/PricingField'
import { PostTitleField } from '#/components/PostTitleField'
import { PostCategoryField } from '#/components/PostCategoryField'
import { PostDescriptionField } from '#/components/PostDescriptionField'
import { useActiveProfile } from '#/context/activeProfile'
import { Permissions, hasPermissions } from '@marketplace/shared'
import { LocationField } from './-components/LocationField'

const schema = z.object({
  postType: z.enum(['OFFER', 'REQUEST']),
  postTitle: z.string().min(3),
  description: z.string().min(10),
  categoryIds: z.array(z.string()),
  price: z.string().optional(),
  rateType: z.enum(['HOURLY', 'DAILY', 'FIXED']).optional(),
  locationId: z.string().optional(),
  locationExternalId: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute('/$locale/_app/create-post')({
  beforeLoad: ({ context: { user }, location, params }) => {
    if (!user)
      throw redirect({
        to: '/$locale/login',
        params,
        search: { redirect: location.href },
        replace: true,
      })
    const canCreatePosts = hasPermissions(user.role?.permissions ?? [], [Permissions.PostsCreate])
    if (!canCreatePosts) throw redirect({ to: '/$locale/posts', params })
  },
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient.ensureQueryData(categoriesQueryOptions(params.locale as string))
  },
  pendingComponent: CreatePostSkeleton,
  component: CreatePostPage,
})

function CreatePostSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="mb-4 h-9 w-20" />
      <div className="mb-3 flex items-center gap-3 rounded-lg border px-4 py-2.5">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <Card className="border-0 shadow-lg pt-0">
        <CardHeader className="flex flex-col rounded-t-xl px-6 pt-4 pb-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
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
            {/* Row 5 skeleton: Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-lg" />
                  <Skeleton className="h-5 w-36" />
                </div>
                <Skeleton className="h-9 w-44" />
              </div>
              <Skeleton className="h-11 w-full" />
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

function CreatePostPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const router = useRouter()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const { activeProfile } = useActiveProfile()

  const { data: categories = [] } = useSuspenseQuery(categoriesQueryOptions(locale))

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      postType: 'OFFER',
      postTitle: '',
      description: '',
      categoryIds: [],
      price: '',
      rateType: undefined,
      locationId: '',
      locationExternalId: '',
    },
  })

  const { isValid } = form.formState
  const priceValue = form.watch('price')

  useEffect(() => {
    if (!priceValue) {
      form.setValue('rateType', undefined, { shouldValidate: true })
    }
  }, [priceValue, form])

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!activeProfile) throw new Error('No active profile')

      const hasNewLocation = !!values.locationExternalId

      const body = {
        authorId: activeProfile.userProfileId,
        postTitle: values.postTitle,
        description: values.description,
        postType: values.postType,
        categoryIds: values.categoryIds.length ? values.categoryIds : undefined,
        price: values.price || undefined,
        rateType: values.rateType,
        ...(hasNewLocation
          ? { location: { externalId: values.locationExternalId! } }
          : { locationId: values.locationId || undefined }),
      }
      const { data, error } = await api.posts.post(body)
      if (error) throw wrapEdenError(error, 'Failed to create post.')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({
        queryKey: ['profiles', activeProfile?.userProfileId, 'posts'],
      })
      queryClient.invalidateQueries({
        queryKey: ['locations', 'profile', activeProfile?.userProfileId],
      })
      void navigate({ to: '/$locale/my-postings', params: { locale } })
    },
    onError: (error) => form.setError('root', { message: error.message }),
  })

  const onSubmit: SubmitHandler<FormValues> = (values) => mutation.mutate(values)

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <BackButton onClick={() => router.history.back()} />

      {activeProfile && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-500/30 dark:bg-blue-500/15">
          <ProfileAvatar name={activeProfile.name} className="size-8 shrink-0" />
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {t('createPost.postingAs')}
            </p>
            <p className="text-base font-semibold leading-tight">{activeProfile.name}</p>
          </div>
        </div>
      )}

      <Card className="border-0 shadow-lg pt-0">
        <CardHeader className="flex flex-col rounded-t-xl px-6 pt-4 pb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <CardTitle className="text-lg">{t('createPost.title')}</CardTitle>
          <CardDescription className="text-sm">{t('createPost.subtitle')}</CardDescription>
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

            {/* Row 4: Location — full width */}
            <LocationField
              control={form.control}
              profileId={activeProfile?.userProfileId ?? ''}
              showSaveHint
            />

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
                {mutation.isPending ? t('createPost.submitting') : t('createPost.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
