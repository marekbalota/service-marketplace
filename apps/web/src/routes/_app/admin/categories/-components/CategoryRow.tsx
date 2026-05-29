import { Pencil, Trash2, Archive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'

export type Category = {
  categoryId: string
  name: string
  activePosts: number
  archivedPosts: number
}

interface CategoryRowProps {
  category: Category
  onRename: (category: Category) => void
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

export function CategoryRow({ category, onRename, onDelete }: CategoryRowProps) {
  const { t } = useTranslation()

  return (
    <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary">
              {category.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{category.name}</p>
            {/* desktop: stats inline below name */}
            <p className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-0.5">
              <PostCounts activePosts={category.activePosts} archivedPosts={category.archivedPosts} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="sm" className="gap-2" aria-label={t('common.rename')} onClick={() => onRename(category)}>
            <Pencil className="size-4" />
            <span className="hidden sm:inline">{t('common.rename')}</span>
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
