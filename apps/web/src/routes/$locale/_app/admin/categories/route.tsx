import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { BackButton } from '#/components/BackButton'
import { PageHeader } from '#/components/PageHeader'
import { Permissions, hasPermissions, SUPPORTED_LOCALES } from '@marketplace/shared'
import { adminCategoriesQueryOptions } from '#/lib/queries/admin'
import { CategoriesContent } from './-components/CategoriesContent'
import { useLocale } from '#/lib/useLocale'

const PAGE_SIZE = 10

export const SORT_BY_VALUES = ['name', 'activePosts', 'archivedPosts', 'totalPosts'] as const
export const SORT_ORDER_VALUES = ['asc', 'desc'] as const
export const TRANSLATION_FILTER_VALUES = ['complete', 'incomplete', ...SUPPORTED_LOCALES] as const

export type SortBy = typeof SORT_BY_VALUES[number]
export type SortOrder = typeof SORT_ORDER_VALUES[number]
export type TranslationFilter = typeof TRANSLATION_FILTER_VALUES[number]

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
  loader: ({ context: { queryClient }, deps: { q, page, sortBy, sortOrder, translationFilter }, params }) => {
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

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/$locale/admin', params: { locale } })} label={t('admin.backToAdmin')} />
      <PageHeader
        title={t('admin.categories.title')}
        description={t('admin.categories.subtitle')}
      />
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesContent />
      </Suspense>
    </main>
  )
}

function CategoriesSkeleton() {
  return (
    <>
      <Card className="mb-6">
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-36 shrink-0" />
              <Skeleton className="size-9 shrink-0 rounded-md" />
            </div>
            <div className="hidden gap-3 lg:flex">
              <Skeleton className="h-9 w-[200px]" />
              <Skeleton className="h-9 w-[180px]" />
            </div>
          </div>
        </CardContent>
      </Card>

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
    </>
  )
}
