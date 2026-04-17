import { useRef } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

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
  isUploading,
}: {
  previews: string[]
  onFilePicked: (file: File) => void
  onRemove: (index: number) => void
  isUploading?: boolean
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
      <Label>Images</Label>
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
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="h-24 w-full border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          {isUploading ? (
            <span className="text-xs">Uploading…</span>
          ) : (
            <Plus className="size-6" />
          )}
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
    mode: 'onChange',
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel >Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., John Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel >Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel >Phone Number</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fax"
            render={({ field }) => (
              <FormItem>
                <FormLabel >Fax</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 (555) 123-4568" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel >Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell others about yourself or your business..."
                  rows={3}
                  className="resize-none break-words [field-sizing:fixed]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {children}
        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
