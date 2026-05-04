import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Route } from '../index'

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name' | 'reviews-most' | 'reviews-least'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
  name: 'Name: A to Z',
  'reviews-most': 'Reviews: Most First',
  'reviews-least': 'Reviews: Fewest First',
}

export function SortSelect() {
  const { sort = 'newest' } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <Select
      value={sort}
      onValueChange={(v) =>
        navigate({ search: (prev) => ({ ...prev, sort: v === 'newest' ? undefined : (v as SortOption), page: undefined }) })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{SORT_LABELS[sort]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
