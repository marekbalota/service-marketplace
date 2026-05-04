import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

interface StarRatingInputProps {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}

export function StarRatingInput({ value, onChange, disabled }: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0)
  const displayValue = hoverValue || value

  return (
    <div className="flex gap-1" onMouseLeave={() => setHoverValue(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Button
          key={star}
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          className="p-1"
        >
          <Star
            className={cn(
              'size-6',
              star <= displayValue
                ? 'fill-star-filled text-star-filled'
                : 'text-star-empty'
            )}
          />
        </Button>
      ))}
    </div>
  )
}
