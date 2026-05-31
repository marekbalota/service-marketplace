import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LOCALES } from '@marketplace/shared'
import { ApiError } from '#/lib/api-error'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { ScrollBar } from '#/components/ui/scroll-area'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldError } from '#/components/ui/field'
import { Label } from '#/components/ui/label'

export type CategoryValues = {
  translations: Array<{ locale: string; name: string }>
}

type FormValues = z.infer<typeof categorySchema>

const EMPTY_TRANSLATIONS = Object.fromEntries(SUPPORTED_LOCALES.map((l: string) => [l, '']))

const categorySchema = z.object({
  translations: z.record(z.string(), z.string()),
}).superRefine((data, ctx) => {
  if (!(data.translations['en'] ?? '').trim()) {
    ctx.addIssue({
      code: 'custom' as const,
      message: 'English translation is required',
      path: ['translations', 'en'],
    })
  }
})

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  defaultValues?: CategoryValues
  onSubmit: (values: CategoryValues) => Promise<void>
}

export function CategoryDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  defaultValues,
  onSubmit,
}: CategoryDialogProps) {
  const { t } = useTranslation()

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(categorySchema),
    mode: 'onTouched',
    defaultValues: {
      translations: {
        ...EMPTY_TRANSLATIONS,
        ...Object.fromEntries((defaultValues?.translations ?? []).map((t) => [t.locale, t.name])),
      },
    },
  })

  const translations = watch('translations')
  const enValue = translations['en'] ?? ''

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const submit: SubmitHandler<FormValues> = async (values) => {
    const payload: CategoryValues = {
      translations: Object.entries(values.translations)
        .filter(([, name]) => name.trim().length > 0)
        .map(([locale, name]) => ({ locale, name: name.trim() })),
    }
    try {
      await onSubmit(payload)
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 409) {
        if (e.locale) {
          setError(`translations.${e.locale}` as Parameters<typeof setError>[0], {
            message: t('admin.categories.nameConflict'),
          })
        } else {
          setError('root', { message: t('admin.categories.nameConflict') })
        }
      } else {
        setError('root', { message: t('errors.generic') })
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="min-w-0 space-y-4 pt-2">
          <Tabs defaultValue="en">
            <ScrollAreaPrimitive.Root className="group min-w-0">
              <ScrollAreaPrimitive.Viewport className="w-full pb-2">
                <TabsList className="w-max">
                  {SUPPORTED_LOCALES.map((locale) => {
                    const filled = (translations[locale] ?? '').trim().length > 0
                    return (
                      <TabsTrigger key={locale} value={locale} className="gap-1">
                        {locale.toUpperCase()}
                        {filled && <span className="size-1.5 rounded-full bg-primary" />}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </ScrollAreaPrimitive.Viewport>
              <ScrollBar orientation="horizontal" className="opacity-0 transition-opacity group-hover:opacity-100" />
            </ScrollAreaPrimitive.Root>

            {SUPPORTED_LOCALES.map((locale) => {
              const isRequired = locale === 'en'
              return (
                <TabsContent key={locale} value={locale} className="mt-3">
                  <Controller
                    control={control}
                    name={`translations.${locale}`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Label htmlFor={`translation-${locale}`}>
                          {t(`locales.${locale}`)}{' '}
                          <span className="text-muted-foreground text-xs">
                            ({isRequired
                              ? t('admin.categories.translationRequired')
                              : t('admin.categories.translationOptional')})
                          </span>
                        </Label>
                        <Input
                          {...field}
                          id={`translation-${locale}`}
                          placeholder={t('admin.categories.categoryNamePlaceholder')}
                          aria-invalid={fieldState.invalid}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </TabsContent>
              )
            })}
          </Tabs>

          <FieldError errors={[errors.root]} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !enValue.trim()}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
