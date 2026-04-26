import { useQuery } from '@tanstack/react-query'
import { MultiSelect } from '#/components/ui/multi-select'
import { categoriesQueryOptions } from '#/lib/queries/posts'
import { Route } from '../index'
import { normalizeCategory } from '../-queries/posts'

export function CategorySelect() {
  const { category } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: categories = [] } = useQuery(categoriesQueryOptions)
  const selected = normalizeCategory(category)

  return (
    <MultiSelect
      options={categories.map((c: { categoryId: string; name: string }) => ({
        value: c.categoryId,
        label: c.name,
      }))}
      value={selected}
      onValueChange={(next) =>
        navigate({
          search: (prev) => ({
            ...prev,
            category: next.length > 0 ? next : undefined,
            page: undefined,
          }),
        })
      }
      placeholder="All Categories"
      displayMode="text"
      showSelectAll
      searchable
    />
  )
}
