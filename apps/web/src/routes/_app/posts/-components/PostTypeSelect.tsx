import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Route } from '../index'

type PostTypeFilter = 'all' | 'offer' | 'request'

const POST_TYPE_LABELS: Record<PostTypeFilter, string> = {
  all: 'All Types',
  offer: 'Offers Only',
  request: 'Requests Only',
}

export function PostTypeSelect() {
  const { type = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <Select
      value={type}
      onValueChange={(v) =>
        navigate({ search: (prev) => ({ ...prev, type: v === 'all' ? undefined : (v as PostTypeFilter), page: undefined }) })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{POST_TYPE_LABELS[type]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(POST_TYPE_LABELS) as [PostTypeFilter, string][]).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
