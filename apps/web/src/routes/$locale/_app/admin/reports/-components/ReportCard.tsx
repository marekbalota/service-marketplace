import { useState } from 'react'
import { Ban, Eye } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { BanDialog } from '../../users/-components/BanDialog'
import { UnbanDialog } from '../../users/-components/UnbanDialog'
import { MessageContextDialog } from './MessageContextDialog'
import { useLocale } from '#/lib/useLocale'
import type { AdminReportsModel } from 'api'

type ReportItem = AdminReportsModel['reportsResponse']['items'][number]

const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  DISMISSED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export function ReportCard({ report }: { report: ReportItem }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const queryClient = useQueryClient()

  const STATUS_DISPLAY: Record<string, string> = {
    PENDING: t('admin.reports.pending'),
    RESOLVED: t('admin.reports.resolved'),
    DISMISSED: t('admin.reports.dismissed'),
  }

  const TYPE_LABELS: Record<string, string> = {
    POST: t('admin.reports.posts'),
    MESSAGE: t('admin.reports.messages'),
    REVIEW: t('admin.reports.reviews'),
  }
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false)
  const [messageContextOpen, setMessageContextOpen] = useState(false)

  const banMutation = useMutation({
    mutationFn: async ({ reason, expiresAt }: { reason: string; expiresAt?: Date }) => {
      if (!report.reportedUserId) return
      const { error: banError } = await api.admin
        .users({ id: report.reportedUserId })
        .ban.patch({ reason, expiresAt })
      if (banError) throw wrapEdenError(banError, 'Failed to ban user.')
      const { error: resolveError } = await api.admin
        .reports({ id: report.reportId })
        .resolve.patch()
      if (resolveError) throw wrapEdenError(resolveError, 'Failed to resolve report.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setBanDialogOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const unbanMutation = useMutation({
    mutationFn: async () => {
      if (!report.reportedUserId) return
      const { error } = await api.admin.users({ id: report.reportedUserId }).unban.patch()
      if (error) throw wrapEdenError(error, 'Failed to unban user.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setUnbanDialogOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.admin.reports({ id: report.reportId }).dismiss.patch()
      if (error) throw wrapEdenError(error, 'Failed to dismiss report.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
    onError: (err) => toast.error(err.message),
  })

  const isPending = report.status === 'PENDING'
  const canBan = isPending && report.reportedUserId !== null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-base">{report.reportedItem}</CardTitle>
              <Badge variant="outline" className="capitalize">
                {TYPE_LABELS[report.targetType] ?? report.targetType}
              </Badge>
              <Badge className={STATUS_CLASSES[report.status]}>
                {STATUS_DISPLAY[report.status] ?? report.status}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {report.reportedUserName && (
                <p>
                  <span className="font-medium text-foreground">
                    {t('admin.reports.reportedUser')}:
                  </span>{' '}
                  {report.reportedUserName}
                  {report.reportedUserEmail && (
                    <span className="text-muted-foreground"> ({report.reportedUserEmail})</span>
                  )}
                </p>
              )}
              <p>
                <span className="font-medium text-foreground">
                  {t('admin.reports.reportedBy')}:
                </span>{' '}
                {report.reporterName}
                <span className="text-muted-foreground"> ({report.reporterEmail})</span>
              </p>
              <p>
                <span className="font-medium text-foreground">{t('admin.reports.reason')}:</span>{' '}
                {report.categoryLabel}
              </p>
              <p>
                <span className="font-medium text-foreground">{t('admin.reports.date')}:</span>{' '}
                {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {report.targetType === 'MESSAGE' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => setMessageContextOpen(true)}
              >
                <Eye className="size-4" />
                {t('common.view')}
              </Button>
              <MessageContextDialog
                reportId={report.reportId}
                open={messageContextOpen}
                onClose={() => setMessageContextOpen(false)}
              />
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
              render={
                <Link
                  to="/$locale/posts/$postId"
                  params={{
                    locale,
                    postId: (report.targetType === 'REVIEW'
                      ? report.reviewPostId
                      : report.postId) as string,
                  }}
                />
              }
            >
              <Eye className="size-4" />
              {t('common.view')}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {report.description && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-1">{t('admin.reports.description')}</p>
            <p className="text-sm text-muted-foreground">{report.description}</p>
          </div>
        )}

        {isPending && (
          <div className="flex gap-2 flex-wrap">
            {canBan &&
              (report.reportedUserIsBanned ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unbanMutation.isPending}
                    onClick={() => setUnbanDialogOpen(true)}
                  >
                    {t('admin.reports.unbanUser')}
                  </Button>
                  <UnbanDialog
                    open={unbanDialogOpen}
                    userName={report.reportedUserName ?? ''}
                    onConfirm={() => unbanMutation.mutateAsync()}
                    onClose={() => setUnbanDialogOpen(false)}
                  />
                </>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    disabled={banMutation.isPending}
                    onClick={() => setBanDialogOpen(true)}
                  >
                    <Ban className="size-4" />
                    {t('admin.reports.banUser')}
                  </Button>
                  <BanDialog
                    open={banDialogOpen}
                    userName={report.reportedUserName ?? ''}
                    onSubmit={(reason, expiresAt) => banMutation.mutateAsync({ reason, expiresAt })}
                    onClose={() => setBanDialogOpen(false)}
                  />
                </>
              ))}

            <Button
              variant="outline"
              size="sm"
              disabled={dismissMutation.isPending}
              onClick={() => dismissMutation.mutate()}
            >
              {t('admin.reports.dismiss')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
