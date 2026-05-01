import { useRef } from 'react'
import { Controller, useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Button } from '#/components/ui/button'
import { Field, FieldGroup, FieldLabel, FieldError } from '#/components/ui/field'

export const profileSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  email:       z.string().email('Invalid email address'),
  bio:         z.string().optional(),
  phoneNumber: z.string().optional(),
  fax:         z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export function ImageInputSection({
  previews,
  onFilePicked,
  onRemove,
}: {
  previews: string[]
  onFilePicked: (file: File) => void
  onRemove: (index: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onFilePicked(file)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <FieldLabel>Images</FieldLabel>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {previews.map((preview, i) => (
          <div key={preview} className="group relative">
            <img
              src={preview}
              alt="Preview"
              className="h-24 w-full rounded-lg border object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => onRemove(i)}
              className="absolute right-1 top-1 size-5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="h-24 w-full border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  )
}

export function ProfileForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isPending,
  children,
}: {
  defaultValues: ProfileFormValues
  onSubmit: SubmitHandler<ProfileFormValues>
  submitLabel: string
  isPending: boolean
  children?: React.ReactNode
}) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onTouched',
  })

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Name *</FieldLabel>
                <Input
                  placeholder="e.g., John Smith"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Email *</FieldLabel>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="phoneNumber"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Phone Number</FieldLabel>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="fax"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Fax</FieldLabel>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4568"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <Controller
          control={form.control}
          name="bio"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Bio</FieldLabel>
              <Textarea
                placeholder="Tell others about yourself or your business..."
                rows={3}
                className="resize-none break-words [field-sizing:fixed]"
                aria-invalid={fieldState.invalid}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>
      {children}
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
