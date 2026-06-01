import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, Suspense } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { BackButton } from '#/components/BackButton'
import { PageHeader } from '#/components/PageHeader'
import { SearchFilterBar } from '#/components/SearchFilterBar'
import { Permissions, hasPermissions, TRANSLATABLE_LOCALES } from '@marketplace/shared'
import { adminCategoriesQueryOptions } from '#/lib/queries/admin'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'
import { CategoriesContent } from './-components/CategoriesContent'
import { CategoryDialog, type CategoryValues } from './-components/CategoryDialog'
import { CategorySortSelect } from './-components/CategorySortSelect'
import { TranslationFilterSelect } from './-components/TranslationFilterSelect'
import { useLocale } from '#/lib/useLocale'

const PAGE_SIZE = 10

export const SORT_BY_VALUES = ['name', 'activePosts', 'archivedPosts', 'totalPosts'] as const
export const SORT_ORDER_VALUES = ['asc', 'desc'] as const
export const TRANSLATION_FILTER_VALUES = [
  'complete',
  'incomplete',
  ...TRANSLATABLE_LOCALES,
] as const

export type SortBy = (typeof SORT_BY_VALUES)[number]
export type SortOrder = (typeof SORT_ORDER_VALUES)[number]
export type TranslationFilter = (typeof TRANSLATION_FILTER_VALUES)[number]

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
  sortBy: z.enum(SORT_BY_VALUES).optional().catch(undefined),
  sortOrder: z.enum(SORT_ORDER_VALUES).optional().catch(undefined),
  translationFilter: z.enum(TRANSLATION_FILTER_VALUES).optional().catch(undefined),
})

export const Route = createFileRoute('/$locale/_app/admin/categories')({
  validateSearch: searchSchema,
  beforeLoad: ({ context: { user }, params }) => {
    const permissions = user?.role?.permissions ?? []
    if (!hasPermissions(permissions, [Permissions.AdminCategoriesManage])) {
      throw redirect({ to: '/$locale/admin', params })
    }
  },
  loaderDeps: ({ search: { q, page, sortBy, sortOrder, translationFilter } }) => ({
    q,
    page,
    sortBy,
    sortOrder,
    translationFilter,
  }),
  loader: ({
    context: { queryClient },
    deps: { q, page, sortBy, sortOrder, translationFilter },
    params,
  }) => {
    void queryClient.prefetchQuery(
      adminCategoriesQueryOptions({
        search: q,
        offset: ((page ?? 1) - 1) * PAGE_SIZE,
        size: PAGE_SIZE,
        locale: params.locale,
        sortBy,
        sortOrder,
        translationFilter,
      }),
    )
  },
  component: ManageCategories,
})

function ManageCategories() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { q = '' } = Route.useSearch()
  const [createOpen, setCreateOpen] = useState(false)

  const createMutation = useMutation({
    mutationFn: async (values: CategoryValues) => {
      const { error } = await api.admin.categories.post(values)
      if (error) throw wrapEdenError(error, 'Failed to create category.')
    },
    onSuccess: () => {
      setCreateOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton
        onClick={() => navigate({ to: '/$locale/admin', params: { locale } })}
        label={t('admin.backToAdmin')}
      />
      <PageHeader
        title={t('admin.categories.title')}
        description={t('admin.categories.subtitle')}
      />
      <Card className="mb-6">
        <CardContent>
          <SearchFilterBar
            searchPlaceholder={t('admin.categories.searchPlaceholder')}
            searchValue={q}
            onSearchChange={(value) =>
              navigate({
                search: (prev) => ({ ...prev, q: value || undefined, page: undefined }),
                replace: true,
              })
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
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesContent />
      </Suspense>
      <CategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('admin.categories.createTitle')}
        description={t('admin.categories.createDesc')}
        submitLabel={t('common.create')}
        onSubmit={(values) => createMutation.mutateAsync(values)}
      />
    </main>
  )
}

function CategoriesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-22" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
