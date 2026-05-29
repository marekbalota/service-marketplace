import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { BackButton } from '#/components/BackButton'
import { PageHeader } from '#/components/PageHeader'
import { Permissions, hasPermissions } from '@marketplace/shared'
import { adminCategoriesQueryOptions } from '#/lib/queries/admin'
import { CategoriesContent } from './-components/CategoriesContent'

const PAGE_SIZE = 10

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/admin/categories')({
  validateSearch: searchSchema,
  beforeLoad: ({ context: { user } }) => {
    const permissions = user?.role?.permissions ?? []
    if (!hasPermissions(permissions, [Permissions.AdminCategoriesManage])) {
      throw redirect({ to: '/admin' })
    }
  },
  loaderDeps: ({ search: { q, page } }) => ({ q, page }),
  loader: ({ context: { queryClient }, deps: { q, page } }) => {
    void queryClient.prefetchQuery(
      adminCategoriesQueryOptions({ search: q ?? '', offset: ((page ?? 1) - 1) * PAGE_SIZE, size: PAGE_SIZE }),
    )
  },
  component: ManageCategories,
})

function ManageCategories() {
  const { t } = useTranslation()
  const navigate = Route.useNavigate()

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin' })} label={t('admin.backToAdmin')} />
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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
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
