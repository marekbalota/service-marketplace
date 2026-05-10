import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { BackButton } from '#/components/BackButton'
import { PageHeader } from '#/components/PageHeader'
import { SearchFilterBar } from '#/components/SearchFilterBar'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { rolesQueryOptions } from '#/lib/queries/admin'
import { UsersTable } from './-components/UsersTable'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  role: z.string().optional().catch(undefined),
  status: z.enum(['all', 'active', 'banned']).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/admin/users/')({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(rolesQueryOptions)
  },
  component: ManageAccounts,
})

const STATUS_LABELS: Record<string, string> = {
  all: 'All Statuses',
  active: 'Active',
  banned: 'Banned',
}

function RoleSelect() {
  const { role = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: allRoles = [] } = useQuery(rolesQueryOptions)

  const roleLabels: Record<string, string> = {
    all: 'All Roles',
    ...Object.fromEntries(allRoles.map((r) => [r.name, r.name])),
  }

  return (
    <Select
      value={role}
      onValueChange={(value) => {
        if (!value) return
        navigate({
          search: (prev) => ({
            ...prev,
            role: value === 'all' ? undefined : value,
            page: undefined,
          }),
        })
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue>{roleLabels[role] ?? 'All Roles'}</SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[var(--anchor-width)]">
        {Object.entries(roleLabels).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
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
            status: value === 'all' ? undefined : (value as 'active' | 'banned'),
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

function UserCardSkeleton() {
  return (
    <Card className="border">
      <CardContent className="pt-2 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 mb-1" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsAndListSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <UserCardSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function ManageAccounts() {
  const navigate = Route.useNavigate()
  const { q = '' } = Route.useSearch()

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => navigate({ to: '/admin' })} label="Back to Admin" />

      <PageHeader
        title="Manage Accounts"
        description="View and manage user accounts, roles, and permissions"
      />

      <Card className="mb-6">
        <CardContent>
          <SearchFilterBar
            searchPlaceholder="Search by name or email..."
            searchValue={q}
            onSearchChange={(value) =>
              navigate({ search: (prev) => ({ ...prev, q: value || undefined, page: undefined }) })
            }
            filters={[
              { label: 'Role', control: <RoleSelect />, desktopWidth: 'w-[180px]' },
              { label: 'Status', control: <StatusSelect />, desktopWidth: 'w-[160px]' },
            ]}
            sheetTitle="Filter Accounts"
            sheetDescription="Narrow the list by role or status"
          />
        </CardContent>
      </Card>

      <Suspense fallback={<StatsAndListSkeleton />}>
        <UsersTable />
      </Suspense>
    </main>
  )
}
