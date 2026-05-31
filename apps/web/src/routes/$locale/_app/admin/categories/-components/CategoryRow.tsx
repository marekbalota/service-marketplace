import { Pencil, Trash2, Archive, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LOCALES } from '@marketplace/shared'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { useLocale } from '#/lib/useLocale'

export type Category = {
  categoryId: string
  translations: Record<string, string>
  activePosts: number
  archivedPosts: number
}

interface CategoryRowProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

function PostCounts({ activePosts, archivedPosts }: { activePosts: number; archivedPosts: number }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-full bg-green-500 shrink-0" />
        {t('admin.categories.activePosts', { count: activePosts })}
      </span>
      <span className="flex items-center gap-1">
        <Archive className="size-3 shrink-0" />
        {t('admin.categories.archivedPosts', { count: archivedPosts })}
      </span>
      <span>
        {'• '}
        {t('admin.categories.totalPosts', { count: activePosts + archivedPosts })}
      </span>
    </>
  )
}

const MAX_CHIPS = 5

function TranslationIndicator({ translations }: { translations: Category['translations'] }) {
  const filledCount = SUPPORTED_LOCALES.filter((locale) => locale in translations).length
  const totalCount = SUPPORTED_LOCALES.length
  const isComplete = filledCount === totalCount

  const fraction = (
    <span
      className={cn(
        'flex items-center gap-0.5 text-xs font-medium whitespace-nowrap shrink-0',
        isComplete
          ? 'text-green-600 dark:text-green-400'
          : 'text-amber-600 dark:text-amber-500',
      )}
    >
      {filledCount}/{totalCount}
      {isComplete ? <CheckCircle className="size-3" /> : <AlertCircle className="size-3" />}
    </span>
  )

  return (
    <>
      {/* Desktop: chips when few locales, fraction when many */}
      <div className="hidden md:flex items-center gap-1 shrink-0">
        {totalCount <= MAX_CHIPS ? (
          SUPPORTED_LOCALES.map((locale) => {
            const has = locale in translations
            return (
              <Badge
                key={locale}
                variant={has ? 'secondary' : 'outline'}
                className={cn('text-xs px-1.5 py-0', !has && 'opacity-40')}
              >
                {locale.toUpperCase()}
              </Badge>
            )
          })
        ) : (
          fraction
        )}
      </div>
      {/* Mobile: always fraction */}
      <span className="md:hidden">{fraction}</span>
    </>
  )
}

export function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const name = category.translations[locale] ?? category.translations['en'] ?? ''

  return (
    <div className="p-4 rounded-lg border transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{name}</p>
              <TranslationIndicator translations={category.translations} />
            </div>
            {/* desktop: stats inline below name */}
            <p className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-0.5">
              <PostCounts activePosts={category.activePosts} archivedPosts={category.archivedPosts} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label={t('common.edit')}
            onClick={() => onEdit(category)}
          >
            <Pencil className="size-4" />
            <span className="hidden sm:inline">{t('common.edit')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={t('common.delete')}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(category)}
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">{t('common.delete')}</span>
          </Button>
        </div>
      </div>
      {/* mobile: stats on a separate row below */}
      <p className="flex sm:hidden flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-2">
        <PostCounts activePosts={category.activePosts} archivedPosts={category.archivedPosts} />
      </p>
    </div>
  )
}
