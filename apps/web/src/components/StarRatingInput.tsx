import { Star } from 'lucide-react'
import { cn } from '#/lib/utils'

interface StarRatingInputProps {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}

export function StarRatingInput({ value, onChange, disabled }: StarRatingInputProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className={cn(
            'p-1 transition-colors',
            disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 cursor-pointer'
          )}
        >
          <Star
            className={cn(
              'size-6',
              star <= value
                ? 'fill-star-filled text-star-filled'
                : 'text-star-empty'
            )}
          />
        </button>
      ))}
    </div>
  )
}
