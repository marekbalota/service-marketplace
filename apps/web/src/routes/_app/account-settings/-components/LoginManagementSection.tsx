import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { api } from '#/api'
import { useCurrentUser } from '#/lib/queries/users'
import { sessionsQueryOptions } from '../-queries/sessions'
import { SessionRow } from './SessionRow'

export function LoginManagementSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  const { data: sessions } = useQuery(sessionsQueryOptions)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const isImpersonating = !user || !!user.impersonatedBy

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await api.sessions({ id: sessionId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionsQueryOptions.queryKey })
      toast.success(t('accountSettings.sessions.revokedSuccess'))
    },
    onError: () => {
      toast.error(t('accountSettings.sessions.revokedError'))
    },
  })

  const bulkLogoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.sessions.delete()
      if (error) throw error
    },
    onSuccess: () => {
      setBulkDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: sessionsQueryOptions.queryKey })
      toast.success(t('accountSettings.sessions.logoutAllSuccess'))
    },
    onError: () => {
      toast.error(t('accountSettings.sessions.logoutAllError'))
    },
  })

  const sortedSessions = sessions?.slice().sort((a, b) => {
    if (a.id === user?.sessionId) return -1
    if (b.id === user?.sessionId) return 1
    return 0
  })
  const otherSessions = sessions?.filter((s) => s.id !== user?.sessionId) ?? []
  const hasOtherSessions = otherSessions.length > 0

  return (
    <>
      <Card id="login-management">
        <CardHeader>
          <CardTitle>{t('accountSettings.loginManagement')}</CardTitle>
          <CardDescription>{t('accountSettings.loginManagementSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t('accountSettings.sessions.activeSessions')}
          </p>

          <div>
            {sortedSessions?.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isCurrent={session.id === user?.sessionId}
                isImpersonating={isImpersonating}
                onRevoke={(id) => revokeMutation.mutate(id)}
              />
            ))}
          </div>

          {!hasOtherSessions && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('accountSettings.sessions.noOtherSessions')}
            </p>
          )}

          <Separator className="my-4" />

          <div className="flex flex-col gap-2 items-start">
            {isImpersonating ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span tabIndex={0} className="inline-flex">
                      <Button variant="destructive" disabled className="gap-2">
                        <LogOut className="size-4" />
                        {t('accountSettings.sessions.logoutOtherDevices')}
                      </Button>
                    </span>
                  }
                />
                <TooltipContent>{t('accountSettings.impersonationRestricted')}</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="destructive"
                disabled={!hasOtherSessions}
                onClick={() => setBulkDialogOpen(true)}
                className="gap-2"
              >
                <LogOut className="size-4" />
                {t('accountSettings.sessions.logoutOtherDevices')}
              </Button>
            )}
            {hasOtherSessions && !isImpersonating && (
              <p className="text-xs text-muted-foreground">
                {t('accountSettings.sessions.logoutOtherHint')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accountSettings.sessions.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('accountSettings.sessions.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkLogoutMutation.mutate()}
              disabled={bulkLogoutMutation.isPending}
            >
              {t('accountSettings.sessions.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
