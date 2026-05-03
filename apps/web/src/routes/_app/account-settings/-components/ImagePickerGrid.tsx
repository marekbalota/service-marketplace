import { useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '#/components/ui/button'

export function ImagePickerGrid({
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {previews.map((preview, i) => (
        <div key={preview} className="group relative">
          <img
            src={preview}
            alt="Preview"
            className="h-32 w-full rounded-lg border object-cover"
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
  )
}
