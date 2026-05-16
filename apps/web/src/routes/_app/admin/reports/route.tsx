import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { BackButton } from '#/components/BackButton'
import { PageHeader } from '#/components/PageHeader'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { reportCategoriesQueryOptions } from '#/lib/queries/reports'
import { Permissions, hasAnyPermission } from '@marketplace/shared'
import { adminReportsQueryOptions } from './-queries/reports'
import { ReportsContent } from './-components/ReportsContent'

const searchSchema = z.object({
  type: z.enum(['all', 'POST', 'MESSAGE', 'REVIEW']).optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  status: z.enum(['all', 'PENDING', 'RESOLVED', 'DISMISSED']).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/admin/reports')({
  validateSearch: searchSchema,
  beforeLoad: ({ context: { user } }) => {
    const permissions = user?.role?.permissions ?? []
    if (
      !hasAnyPermission(permissions, [
        Permissions.AdminUsersView,
        Permissions.AdminUsersBan,
        Permissions.AdminUsersAssignRole,
        Permissions.AdminUsersImpersonate,
        Permissions.AdminPostsDeleteAny,
      ])
    ) {
      throw redirect({ to: '/admin' })
    }
  },
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(
      adminReportsQueryOptions({ targetType: 'all', categoryId: 'all', status: 'all', page: 1 }),
    )
  },
  component: ManageReports,
})

const TYPE_LABELS: Record<string, string> = {
  all: 'All Types',
  POST: 'Posts',
  MESSAGE: 'Messages',
  REVIEW: 'Reviews',
}

const STATUS_LABELS: Record<string, string> = {
  all: 'All Statuses',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
}

function TypeSelect() {
  const { type = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <Select
      value={type}
      onValueChange={(value) =>
        navigate({
          search: (prev) => ({
            ...prev,
            type: value === 'all' ? undefined : (value as 'POST' | 'MESSAGE' | 'REVIEW'),
            category: undefined,
            page: undefined,
          }),
        })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{TYPE_LABELS[type]}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[var(--anchor-width)]">
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CategorySelect() {
  const { type = 'all' } = Route.useSearch()
  if (type === 'all') return null
  return <CategorySelectInner type={type} />
}

function CategorySelectInner({ type }: { type: 'POST' | 'MESSAGE' | 'REVIEW' }) {
  const { category = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: categories = [] } = useQuery(reportCategoriesQueryOptions(type))

  return (
    <Select
      value={category}
      onValueChange={(value) =>
        navigate({
          search: (prev) => ({
            ...prev,
            category: value === 'all' ? undefined : value,
            page: undefined,
          }),
        })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          {category === 'all'
            ? 'All Reasons'
            : (categories.find((c) => c.categoryId === category)?.label ?? 'All Reasons')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[var(--anchor-width)]">
        <SelectItem value="all">All Reasons</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat.categoryId} value={cat.categoryId}>
            {cat.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function StatusSelect() {
  const { status = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <Select
      value={status}
      onValueChange={(value) =>
        navigate({
          search: (prev) => ({
            ...prev,
            status: value === 'all' ? undefined : (value as 'PENDING' | 'RESOLVED' | 'DISMISSED'),
            page: undefined,
          }),
        })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{STATUS_LABELS[status]}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[var(--anchor-width)]">
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ReportCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mt-4" />
      </CardContent>
    </Card>
  )
}

function ReportsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <ReportCardSkeleton key={i} />
        ))}
      </div>
    </>
  )
}

function ManageReports() {
  const navigate = Route.useNavigate()
  const { type = 'all', category = 'all', status = 'all', page = 1 } = Route.useSearch()

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin' })} label="Back to Admin" />

      <PageHeader
        title="Manage Reports"
        description="Review and moderate user-reported posts, messages, and reviews"
      />

      <Card className="mb-6">
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <TypeSelect />
            <CategorySelect />
            <StatusSelect />
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<ReportsSkeleton />}>
        <ReportsContent targetType={type} categoryId={category} status={status} page={page} />
      </Suspense>
    </main>
  )
}
