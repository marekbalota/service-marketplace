import { createFileRoute, useNavigate, redirect, useRouter } from '@tanstack/react-router'
import { wrapEdenError } from '#/lib/api-error'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, AlignLeft, Tag } from 'lucide-react'
import { FieldIconHeader } from '#/components/FieldIconHeader'
import { PostTypeToggle } from '#/components/PostTypeToggle'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { useState, useEffect } from 'react'
import { api } from '#/api'
import { categoriesQueryOptions } from '#/lib/queries/posts'
import { BackButton } from '#/components/BackButton'
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
import { useActiveProfile } from '#/context/activeProfile'
import { Permissions, hasPermissions } from '@marketplace/shared'
import { LocationField } from './-components/LocationField'
import { PricingField } from '#/components/PricingField'

const schema = z.object({
  postType:    z.enum(['OFFER', 'REQUEST']),
  postTitle:   z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryIds: z.array(z.string()),
  price:       z.string().optional(),
  rateType:    z.enum(['HOURLY', 'DAILY', 'FIXED']).optional(),
  locationId:  z.string().optional(),
  country:     z.string().optional(),
  region:      z.string().optional(),
  city:        z.string().optional(),
  street:      z.string().optional(),
  houseNumber: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export const Route = createFileRoute('/_app/create-post')({
  beforeLoad: ({ context: { user }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
    const canCreatePosts = hasPermissions(user.role?.permissions ?? [], [Permissions.PostsCreate])
    if (!canCreatePosts) throw redirect({ to: '/' })
  },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(categoriesQueryOptions)
  },
  pendingComponent: CreatePostSkeleton,
  component: CreatePostPage,
})

function CreatePostSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Skeleton className="mb-4 h-9 w-20" />
      <div className="mb-6 rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </div>
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <Skeleton className="h-5 w-36" />
                </div>
                <Skeleton className="h-9 w-44" />
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

function CreatePostPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { activeProfile } = useActiveProfile()
  const [isManualLocation, setIsManualLocation] = useState(false)

  const { data: categories = [] } = useSuspenseQuery(categoriesQueryOptions)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      postType:    'OFFER',
      postTitle:   '',
      description: '',
      categoryIds: [],
      price:       '',
      rateType:    undefined,
      locationId:  '',
      country:     '',
      region:      '',
      city:        '',
      street:      '',
      houseNumber: '',
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

      const hasManualLocation =
        isManualLocation &&
        (values.country || values.region || values.city || values.street || values.houseNumber)

      const body = {
        authorId:    activeProfile.userProfileId,
        postTitle:   values.postTitle,
        description: values.description,
        postType:    values.postType,
        categoryIds: values.categoryIds.length ? values.categoryIds : undefined,
        price:       values.price || undefined,
        rateType:    values.rateType,
        ...(hasManualLocation
          ? {
              location: {
                country:     values.country || undefined,
                region:      values.region || undefined,
                city:        values.city || undefined,
                street:      values.street || undefined,
                houseNumber: values.houseNumber || undefined,
              },
            }
          : { locationId: values.locationId || undefined }),
      }
      const { data, error } = await api.posts.post(body)
      if (error) throw wrapEdenError(error, 'Failed to create post.')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['profiles', activeProfile?.userProfileId, 'posts'] })
      queryClient.invalidateQueries({ queryKey: ['locations', 'profile', activeProfile?.userProfileId] })
      navigate({ to: '/my-postings' })
    },
    onError: (error) => form.setError('root', { message: error.message }),
  })

  const onSubmit: SubmitHandler<FormValues> = (values) => mutation.mutate(values)

  const handleToggleLocation = () => {
    setIsManualLocation((prev) => !prev)
    form.setValue('locationId', '')
    form.setValue('country', '')
    form.setValue('region', '')
    form.setValue('city', '')
    form.setValue('street', '')
    form.setValue('houseNumber', '')
    form.clearErrors(['locationId', 'country', 'region', 'city'])
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <BackButton onClick={() => router.history.back()} />

      {activeProfile && (
        <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-100 dark:bg-blue-500/20 p-4">
          <div className="flex items-center gap-3">
            <ProfileAvatar name={activeProfile.name} className="size-10 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Posting as</p>
              <p className="font-semibold text-foreground">{activeProfile.name}</p>
            </div>
          </div>
        </div>
      )}

      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl">Create New Posting</CardTitle>
          <CardDescription className="text-base">
            Post a service you're offering or a service you're looking for
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

            <LocationField
              control={form.control}
              profileId={activeProfile?.userProfileId ?? ''}
              isManualLocation={isManualLocation}
              onToggle={handleToggleLocation}
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
                {mutation.isPending ? 'Creating…' : 'Create Posting'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
