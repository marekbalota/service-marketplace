import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '#/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import { Route, SORT_BY_VALUES, SORT_ORDER_VALUES, type SortBy, type SortOrder } from '../route'

export function CategorySortSelect() {
  const { t } = useTranslation()
  const { sortBy = 'name', sortOrder = 'asc' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const SORT_BY_LABELS: Record<SortBy, string> = {
    name: t('admin.categories.sortByName'),
    activePosts: t('admin.categories.sortByActivePosts'),
    archivedPosts: t('admin.categories.sortByArchivedPosts'),
    totalPosts: t('admin.categories.sortByTotalPosts'),
  }

  const triggerLabel = SORT_BY_LABELS[sortBy]

  return (
    <Popover modal>
      <PopoverTrigger
        className={cn(
          'flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm outline-none select-none transition-colors dark:bg-input/30',
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50',
          'focus-visible:ring-3 focus-visible:ring-ring/50',
        )}
      >
        {sortOrder === 'desc' ? (
          <ArrowDown className="size-3.5 shrink-0" />
        ) : (
          <ArrowUp className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        className="w-(--anchor-width) p-3"
        align="start"
        collisionAvoidance={{ side: 'flip' }}
        positionMethod="fixed"
      >
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t('admin.categories.sortFilterLabel')}
          </p>
          <Select
            value={sortBy}
            onValueChange={(v) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  sortBy: v === 'name' ? undefined : (v as SortBy),
                  page: undefined,
                }),
              })
            }
          >
            <SelectTrigger className="h-8 w-full text-sm">
              <SelectValue>{SORT_BY_LABELS[sortBy]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_BY_VALUES.map((option) => (
                <SelectItem key={option} value={option}>
                  {SORT_BY_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t('admin.categories.sortOrderLabel')}
          </p>
          <ToggleGroup
            value={[sortOrder]}
            onValueChange={(values) => {
              const v = values[0] as SortOrder | undefined
              if (!v) return
              navigate({
                search: (prev) => ({
                  ...prev,
                  sortOrder: v === 'asc' ? undefined : v,
                  page: undefined,
                }),
              })
            }}
            className="grid w-full grid-cols-2 overflow-hidden rounded-lg border p-0"
          >
            {SORT_ORDER_VALUES.map((order, i) => (
              <ToggleGroupItem
                key={order}
                value={order}
                className={[
                  'h-8 rounded-none text-sm',
                  sortOrder === order
                    ? 'aria-pressed:bg-primary aria-pressed:text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-muted',
                  i < SORT_ORDER_VALUES.length - 1 ? 'border-r' : '',
                ].join(' ')}
              >
                {t(`admin.categories.sortOrder${order === 'asc' ? 'Asc' : 'Desc'}`)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </PopoverContent>
    </Popover>
  )
}
