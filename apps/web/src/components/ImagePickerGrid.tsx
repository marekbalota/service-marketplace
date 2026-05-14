import { useRef, useState } from 'react'
import { Plus, X, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'
import { ImageLightbox } from '#/components/ImageLightbox'

function validateImageFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(true)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(false)
    }
    img.src = url
  })
}

export function ImagePickerGrid({
  previews,
  onFilePicked,
  onRemove,
}: {
  previews: string[]
  onFilePicked: (file: File) => void
  onRemove: (index: number) => void
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [rejectedCount, setRejectedCount] = useState(0)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    let rejected = 0
    await Promise.all(
      files.map(async (file) => {
        const valid = await validateImageFile(file)
        if (valid) {
          onFilePicked(file)
        } else {
          rejected++
        }
      }),
    )
    if (rejected > 0) setRejectedCount((r) => r + rejected)
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {previews.map((preview, i) => (
          <div key={`${preview}-${i}`} className="group relative">
            <img
              src={preview}
              alt="Preview"
              className="h-32 w-full cursor-pointer rounded-lg border object-cover"
              onClick={() => setLightboxIndex(i)}
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
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="h-32 w-full border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        >
          <Plus className="size-6" />
        </Button>
      </div>

      {rejectedCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            {t('imagePicker.rejected', { count: rejectedCount })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setRejectedCount(0)}
            className="ml-auto size-6 shrink-0 text-destructive/60 hover:text-destructive"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      <ImageLightbox
        images={previews.map((src) => ({ src, alt: 'Preview' }))}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  )
}
