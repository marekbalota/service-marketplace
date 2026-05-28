import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '#/components/PageHeader'
import { adminStatsQueryOptions, adminRecentUsersQueryOptions } from '#/lib/queries/admin'
import { AdminOptions } from './-components/AdminOptions'
import { StatOverviewCard } from './-components/StatOverviewCard'
import { NewUsersCard } from './-components/NewUsersCard'

export const Route = createFileRoute('/_app/admin/')({
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(adminStatsQueryOptions)
    void queryClient.prefetchQuery(adminRecentUsersQueryOptions)
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const { t } = useTranslation()
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <PageHeader title={t('admin.title')} description={t('admin.subtitle')} />
      <AdminOptions />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <StatOverviewCard />
        <NewUsersCard />
      </div>
    </main>
  )
}
