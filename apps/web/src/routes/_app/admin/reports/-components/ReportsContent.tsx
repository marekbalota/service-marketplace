import { useSuspenseQuery } from '@tanstack/react-query'
import { EmptyState } from '#/components/EmptyState'
import { PaginationBar } from '#/components/PaginationBar'
import { StatCard } from '../../-components/StatCard'
import { adminReportsQueryOptions, type ReportsParams } from '../-queries/reports'
import { ReportCard } from './ReportCard'
import { Route } from '../route'

type Props = {
  targetType: ReportsParams['targetType']
  categoryId: string
  status: ReportsParams['status']
  page: number
}

export function ReportsContent({ targetType, categoryId, status, page }: Props) {
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(
    adminReportsQueryOptions({ targetType, categoryId, status, page }),
  )

  const setPage = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }) })

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard value={data.total} label="Total Reports" />
        <StatCard value={data.totalPending} label="Pending" />
        <StatCard value={data.totalResolved} label="Resolved" />
        <StatCard value={data.totalDismissed} label="Dismissed" />
      </div>

      <div className="space-y-4">
        {data.items.map((report) => (
          <ReportCard key={report.reportId} report={report} />
        ))}
        {data.items.length === 0 && <EmptyState message="No reports found." />}
      </div>

      {data.totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
          className="mt-6"
        />
      )}
    </>
  )
}
