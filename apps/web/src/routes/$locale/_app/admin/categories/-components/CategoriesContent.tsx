import { useState, useEffect } from 'react'
import { Search, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { PaginationBar } from '#/components/PaginationBar'
import { adminCategoriesQueryOptions } from '#/lib/queries/admin'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'
import { Route } from '../route'
import { CategoryDialog, type CategoryValues } from './CategoryDialog'
import { CategoryRow, type Category } from './CategoryRow'

const PAGE_SIZE = 10

export function CategoriesContent() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const { q = '', page = 1 } = Route.useSearch()

  const [searchInput, setSearchInput] = useState(q)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  useEffect(() => {
    if (searchInput === q) return
    const timer = setTimeout(() => {
      void navigate({
        search: (prev) => ({ ...prev, q: searchInput || undefined, page: undefined }),
        replace: true,
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, q, navigate])

  const { data } = useSuspenseQuery(
    adminCategoriesQueryOptions({ search: q, offset: (page - 1) * PAGE_SIZE, size: PAGE_SIZE }),
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>{t('admin.categories.count', { count: total })}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('admin.categories.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                {t('admin.categories.newCategory')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {q ? t('admin.categories.noCategoriesFound') : t('admin.categories.noCategories')}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {items.map((category) => (
                  <CategoryRow
                    key={category.categoryId}
                    category={category}
                    onRename={setEditTarget}
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
          defaultValues={{ name: editTarget.name }}
          onSubmit={(values) => editMutation.mutateAsync({ id: editTarget.categoryId, values })}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('admin.categories.deleteTitle')}
        description={t('admin.categories.deleteDesc', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutateAsync(deleteTarget!.categoryId)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}
