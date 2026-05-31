import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { PaginationBar } from '#/components/PaginationBar'
import { SearchFilterBar } from '#/components/SearchFilterBar'
import { adminCategoriesQueryOptions } from '#/lib/queries/admin'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'
import { Route } from '../route'
import { useLocale } from '#/lib/useLocale'
import { CategoryDialog, type CategoryValues } from './CategoryDialog'
import { CategoryRow, type Category } from './CategoryRow'
import { CategorySortSelect } from './CategorySortSelect'
import { TranslationFilterSelect } from './TranslationFilterSelect'

const PAGE_SIZE = 10

export function CategoriesContent() {
  const { t } = useTranslation()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const { q = '', page = 1, sortBy, sortOrder, translationFilter } = Route.useSearch()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const { data } = useSuspenseQuery(
    adminCategoriesQueryOptions({
      search: q,
      offset: (page - 1) * PAGE_SIZE,
      size: PAGE_SIZE,
      locale,
      sortBy,
      sortOrder,
      translationFilter,
    }),
  )
  const { items, total, totalPages } = data

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  const createMutation = useMutation({
    mutationFn: async (values: CategoryValues) => {
      const { error } = await api.admin.categories.post(values)
      if (error) throw wrapEdenError(error, 'Failed to create category.')
    },
    onSuccess: () => {
      setCreateOpen(false)
      invalidate()
    },
  })

  const editMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CategoryValues }) => {
      const { error } = await api.admin.categories({ id }).patch(values)
      if (error) throw wrapEdenError(error, 'Failed to update category.')
    },
    onSuccess: () => {
      setEditTarget(null)
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.admin.categories({ id }).delete()
      if (error) throw wrapEdenError(error, 'Failed to delete category.')
    },
    onSuccess: () => {
      setDeleteTarget(null)
      invalidate()
    },
  })

  return (
    <>
      <Card className="mb-6">
        <CardContent>
          <SearchFilterBar
            searchPlaceholder={t('admin.categories.searchPlaceholder')}
            searchValue={q}
            onSearchChange={(value) =>
              navigate({ search: (prev) => ({ ...prev, q: value || undefined, page: undefined }), replace: true })
            }
            sheetTitle={t('admin.categories.sortFilterLabel')}
            action={
              <Button className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">{t('admin.categories.newCategory')}</span>
              </Button>
            }
            filters={[
              {
                label: t('admin.categories.sortFilterLabel'),
                control: <CategorySortSelect />,
                desktopWidth: 'w-[240px]',
              },
              {
                label: t('admin.categories.translationFilterLabel'),
                control: <TranslationFilterSelect />,
                desktopWidth: 'w-[200px]',
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.categories.count', { count: total })}</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {q || translationFilter
                ? t('admin.categories.noCategoriesFound')
                : t('admin.categories.noCategories')}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {items.map((category) => (
                  <CategoryRow
                    key={category.categoryId}
                    category={category}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(p) =>
                    navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) })
                  }
                  className="mt-6"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('admin.categories.createTitle')}
        description={t('admin.categories.createDesc')}
        submitLabel={t('common.create')}
        onSubmit={(values) => createMutation.mutateAsync(values)}
      />

      {editTarget && (
        <CategoryDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
          title={t('admin.categories.editTitle')}
          description={t('admin.categories.editDesc')}
          submitLabel={t('common.save')}
          defaultValues={editTarget}
          onSubmit={(values) => editMutation.mutateAsync({ id: editTarget.categoryId, values })}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('admin.categories.deleteTitle')}
        description={t('admin.categories.deleteDesc', {
          name: deleteTarget?.translations[locale] ?? deleteTarget?.translations['en'] ?? '',
        })}
        confirmLabel={t('common.delete')}
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutateAsync(deleteTarget!.categoryId)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}
