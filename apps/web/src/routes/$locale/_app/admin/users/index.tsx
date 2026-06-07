import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
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
import { useLocale } from '#/lib/useLocale'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  role: z.string().optional().catch(undefined),
  status: z.enum(['all', 'active', 'banned']).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/$locale/_app/admin/users/')({
  validateSearch: searchSchema,
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(rolesQueryOptions)
  },
  component: ManageAccounts,
})

function RoleSelect() {
  const { t } = useTranslation()
  const { role = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: allRoles = [] } = useQuery(rolesQueryOptions)

  const roleLabels: Record<string, string> = {
    all: t('admin.users.allRoles'),
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
        <SelectValue>{roleLabels[role] ?? t('admin.users.allRoles')}</SelectValue>
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
  const { t } = useTranslation()
  const { status = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const STATUS_LABELS: Record<string, string> = {
    all: t('admin.users.allStatuses'),
    active: t('admin.users.active'),
    banned: t('admin.users.banned'),
  }

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
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = Route.useNavigate()
  const { q = '' } = Route.useSearch()

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton
        onClick={() => navigate({ to: '/$locale/admin', params: { locale } })}
        label={t('admin.backToAdmin')}
      />

      <PageHeader title={t('admin.users.title')} description={t('admin.users.subtitle')} />

      <Card className="mb-6">
        <CardContent>
          <SearchFilterBar
            searchPlaceholder={t('admin.users.searchPlaceholder')}
            searchValue={q}
            onSearchChange={(value) =>
              navigate({ search: (prev) => ({ ...prev, q: value || undefined, page: undefined }) })
            }
            filters={[
              { label: t('admin.users.role'), control: <RoleSelect />, desktopWidth: 'w-[180px]' },
              {
                label: t('admin.users.status'),
                control: <StatusSelect />,
                desktopWidth: 'w-[160px]',
              },
            ]}
            sheetTitle={t('admin.users.filterTitle')}
            sheetDescription={t('admin.users.filterSubtitle')}
          />
        </CardContent>
      </Card>

      <Suspense fallback={<StatsAndListSkeleton />}>
        <UsersTable />
      </Suspense>
    </main>
  )
}
