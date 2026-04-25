import { createFileRoute, useNavigate, redirect, useRouter } from '@tanstack/react-router'
import { queryOptions, useQuery, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, User, FileText, AlignLeft, Tag, DollarSign } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '#/api'
import { categoriesQueryOptions } from '#/routes/_app/posts/index'
import { formatLocation } from '#/lib/format'
import { BackButton } from '#/components/BackButton'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { MultiSelect } from '#/components/ui/multi-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '#/components/ui/card'
import {
  Field,
  FieldLabel,
  FieldError,
} from '#/components/ui/field'
import { useActiveProfile } from '#/hooks/useActiveProfile'
import { Permissions, hasPermissions } from '@marketplace/shared'

// --- Query options ---

export function profileLocationsQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['locations', 'profile', profileId] as const,
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).locations.get()
      if (error) throw error
      return data ?? []
    },
    enabled: !!profileId,
  })
}

// --- Zod schema ---

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

// --- Route ---

export const Route = createFileRoute('/_app/create-post')({
  beforeLoad: ({ context: { user } }) => {
    if (!user) throw redirect({ to: '/login' })
    const canCreatePosts = hasPermissions(user.role?.permissions ?? [], [Permissions.PostsCreate])
    if (!canCreatePosts) throw redirect({ to: '/' })
  },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(categoriesQueryOptions)
  },
  component: CreatePostPage,
})

// --- Page ---

function CreatePostPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { activeProfile } = useActiveProfile()
  const [isManualLocation, setIsManualLocation] = useState(false)

  const { data: categories = [] } = useSuspenseQuery(categoriesQueryOptions)
  const { data: previousLocations = [] } = useQuery(
    profileLocationsQueryOptions(activeProfile?.userProfileId ?? ''),
  )

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

  // Clear rateType when price is removed
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
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['profiles', activeProfile?.userProfileId, 'posts'] })
      queryClient.invalidateQueries({ queryKey: ['locations', 'profile', activeProfile?.userProfileId] })
      navigate({ to: '/my-postings' })
    },
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
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600">
              <User className="size-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Posting as</p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">{activeProfile.name}</p>
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
            {/* Post Type */}
            <Controller
              control={form.control}
              name="postType"
              render={({ field }) => (
                <Field>
                  <FieldLabel className="text-base font-semibold">Type *</FieldLabel>
                  <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-lg border">
                    {(['OFFER', 'REQUEST'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => field.onChange(type)}
                        className={[
                          'px-4 py-3 text-sm font-medium transition-colors',
                          field.value === type
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-foreground hover:bg-muted',
                          type === 'OFFER' ? 'border-r' : '',
                        ].join(' ')}
                      >
                        {type === 'OFFER' ? 'Offering Service' : 'Requesting Service'}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            />

            {/* Title */}
            <Controller
              control={form.control}
              name="postTitle"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                      <FileText className="size-5 text-blue-600" />
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

            {/* Description */}
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950">
                      <AlignLeft className="size-5 text-purple-600" />
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

            {/* Categories */}
            <Controller
              control={form.control}
              name="categoryIds"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950">
                      <Tag className="size-5 text-green-600" />
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

            {/* Location */}
            <Field className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950">
                    <MapPin className="size-5 text-orange-600" />
                  </div>
                  <span className="text-base font-semibold">Location (Optional)</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={handleToggleLocation}
                >
                  <MapPin className="size-4" />
                  {isManualLocation ? 'Use Previous Location' : 'Enter New Location'}
                </Button>
              </div>

              {!isManualLocation ? (
                <Controller
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Select value={field.value} onValueChange={(v) => { field.onChange(v); field.onBlur() }} disabled={previousLocations.length === 0}>
                        <SelectTrigger className="!h-11 w-full">
                          <SelectValue placeholder="Select from your previous locations">
                            {field.value
                              ? formatLocation(
                                  previousLocations.find((l) => l.locationId === field.value) ?? {},
                                ) || undefined
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {previousLocations.map((loc) => (
                            <SelectItem key={loc.locationId} value={loc.locationId}>
                              {formatLocation(loc)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {previousLocations.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No previous locations. Click 'Enter New Location' to add one.
                        </p>
                      )}
                    </div>
                  )}
                />
              ) : (
                <Card className="border-2 border-dashed bg-muted/50">
                  <CardContent className="space-y-4 pt-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Controller
                        control={form.control}
                        name="country"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="country">Country</FieldLabel>
                            <Input {...field} id="country" placeholder="e.g., Czech Republic" aria-invalid={fieldState.invalid} />
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                      <Controller
                        control={form.control}
                        name="region"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="region">Region/State</FieldLabel>
                            <Input {...field} id="region" placeholder="e.g., South Moravian Region" aria-invalid={fieldState.invalid} />
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                    </div>
                    <Controller
                      control={form.control}
                      name="city"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="city">City</FieldLabel>
                          <Input {...field} id="city" placeholder="e.g., Brno" aria-invalid={fieldState.invalid} />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Controller
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                          <Field className="md:col-span-2">
                            <FieldLabel htmlFor="street">Street</FieldLabel>
                            <Input {...field} id="street" placeholder="e.g., Botanická" />
                          </Field>
                        )}
                      />
                      <Controller
                        control={form.control}
                        name="houseNumber"
                        render={({ field }) => (
                          <Field>
                            <FieldLabel htmlFor="houseNumber">House No.</FieldLabel>
                            <Input {...field} id="houseNumber" placeholder="e.g., 68a" />
                          </Field>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </Field>

            {/* Pricing */}
            <Field className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
                  <DollarSign className="size-5 text-emerald-600" />
                </div>
                <span className="text-base font-semibold">Pricing (Optional)</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="price">Price ($)</FieldLabel>
                      <Input
                        {...field}
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-11"
                      />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="rateType"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Rate Type</FieldLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(v) => { field.onChange(v); field.onBlur() }}
                        disabled={!priceValue}
                      >
                        <SelectTrigger className="!h-11 w-full">
                          <SelectValue placeholder="Select rate type">
                            {field.value === 'HOURLY'
                              ? 'Hourly Rate'
                              : field.value === 'DAILY'
                                ? 'Daily Rate'
                                : field.value === 'FIXED'
                                  ? 'Fixed Price'
                                  : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOURLY">Hourly Rate</SelectItem>
                          <SelectItem value="DAILY">Daily Rate</SelectItem>
                          <SelectItem value="FIXED">Fixed Price</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground">Leave price empty if negotiable</p>
            </Field>

            {mutation.isError && (
              <FieldError errors={[{ message: 'Failed to create post. Please try again.' }]} />
            )}

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
