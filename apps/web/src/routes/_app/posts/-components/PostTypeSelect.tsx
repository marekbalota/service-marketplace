import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Route } from '../index'

type PostTypeFilter = 'all' | 'offer' | 'request'

export function PostTypeSelect() {
  const { t } = useTranslation()
  const { type = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const POST_TYPE_LABELS: Record<PostTypeFilter, string> = {
    all: t('posts.allTypes'),
    offer: t('posts.offersOnly'),
    request: t('posts.requestsOnly'),
  }

  return (
    <Select
      value={type}
      onValueChange={(v) =>
        navigate({
          search: (prev) => ({
            ...prev,
            type: v === 'all' ? undefined : (v as PostTypeFilter),
            page: undefined,
          }),
        })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{POST_TYPE_LABELS[type]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(POST_TYPE_LABELS) as [PostTypeFilter, string][]).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
