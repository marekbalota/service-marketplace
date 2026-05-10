import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent } from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'

export interface LightboxImage {
  src: string
  alt?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}

export function ImageLightbox({ images, initialIndex = 0, open, onClose }: ImageLightboxProps) {
  const [index, setIndex] = React.useState(initialIndex)

  // Sync index when the lightbox opens with a new initialIndex
  React.useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  const total = images.length
  const current = images[index]

  function prev() {
    setIndex((i) => (i - 1 + total) % total)
  }

  function next() {
    setIndex((i) => (i + 1) % total)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prev()
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      next()
    }
  }

  if (!current) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent
        showCloseButton
        className="flex max-w-[95vw] flex-col items-center gap-3 p-6 sm:max-w-[95vw]"
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex w-full items-center justify-center">
          {total > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={prev}
              className="absolute left-0 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-6" />
            </Button>
          )}

          <img
            key={current.src}
            src={current.src}
            alt={current.alt ?? 'Image'}
            className="max-h-[80vh] max-w-full rounded object-contain"
          />

          {total > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              className="absolute right-0 z-10"
              aria-label="Next image"
            >
              <ChevronRight className="size-6" />
            </Button>
          )}
        </div>

        {total > 1 && (
          <p className="text-sm text-muted-foreground">
            {index + 1} / {total}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
