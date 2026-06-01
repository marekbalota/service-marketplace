import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Route } from '../index'

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name' | 'reviews-most' | 'reviews-least'

export function SortSelect() {
  const { t } = useTranslation()
  const { sort = 'newest' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const SORT_LABELS: Record<SortOption, string> = {
    newest: t('posts.sort.newest'),
    'price-low': t('posts.sort.priceLow'),
    'price-high': t('posts.sort.priceHigh'),
    name: t('posts.sort.nameAz'),
    'reviews-most': t('posts.sort.reviewsMost'),
    'reviews-least': t('posts.sort.reviewsFewest'),
  }

  return (
    <Select
      value={sort}
      onValueChange={(v) =>
        navigate({
          search: (prev) => ({
            ...prev,
            sort: v === 'newest' ? undefined : (v as SortOption),
            page: undefined,
          }),
        })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{SORT_LABELS[sort]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
