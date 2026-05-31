import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { PaginationBar } from '#/components/PaginationBar'
import { adminCategoriesQueryOptions } from '#/lib/queries/admin'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'
import { Route } from '../route'
import { useLocale } from '#/lib/useLocale'
import { CategoryDialog, type CategoryValues } from './CategoryDialog'
import { CategoryRow, type Category } from './CategoryRow'

const PAGE_SIZE = 10

export function CategoriesContent() {
  const { t } = useTranslation()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const { q = '', page = 1, sortBy, sortOrder, translationFilter } = Route.useSearch()

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
