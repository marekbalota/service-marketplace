import { MultiSelect } from '#/components/ui/multi-select'
import { Route } from '../index'
import { normalizeRating, type RatingRange } from '../-queries/posts'

const RATING_OPTIONS: { value: RatingRange; label: string }[] = [
  { value: '5-4', label: '5-4 ★' },
  { value: '4-3', label: '4-3 ★' },
  { value: '3-2', label: '3-2 ★' },
  { value: '2-1', label: '2-1 ★' },
  { value: 'none', label: 'Without review' },
]

export function RatingSelect() {
  const { rating } = Route.useSearch()
  const navigate = Route.useNavigate()
  const selected = normalizeRating(rating)

  return (
    <MultiSelect
      options={RATING_OPTIONS}
      value={selected}
      onValueChange={(next) =>
        navigate({
          search: (prev) => ({
            ...prev,
            rating: next.length > 0 ? (next as RatingRange[]) : undefined,
            page: undefined,
          }),
        })
      }
      placeholder="All Ratings"
      displayMode="text"
      showSelectAll
    />
  )
}
