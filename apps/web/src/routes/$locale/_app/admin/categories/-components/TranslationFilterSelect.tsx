import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Route, TRANSLATION_FILTER_VALUES, type TranslationFilter } from '../route'

const ALL_VALUE = '__all__'

export function TranslationFilterSelect() {
  const { t } = useTranslation()
  const { translationFilter } = Route.useSearch()
  const navigate = Route.useNavigate()

  const value = translationFilter ?? ALL_VALUE

  const getLabel = (v: TranslationFilter | typeof ALL_VALUE) => {
    if (v === ALL_VALUE) return t('admin.categories.translationFilterAll')
    if (v === 'complete') return t('admin.categories.translationFilterComplete')
    if (v === 'incomplete') return t('admin.categories.translationFilterIncomplete')
    return t('admin.categories.translationFilterMissing', { locale: v.toUpperCase() })
  }

  return (
    <Select
      value={value}
      onValueChange={(v) =>
        navigate({
          search: (prev) => ({
            ...prev,
            translationFilter: v === ALL_VALUE ? undefined : (v as TranslationFilter),
            page: undefined,
          }),
        })
      }
    >
      <SelectTrigger className="h-8 w-full text-sm">
        <SelectValue>{getLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{t('admin.categories.translationFilterAll')}</SelectItem>
        {TRANSLATION_FILTER_VALUES.map((v) => (
          <SelectItem key={v} value={v}>
            {getLabel(v)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
