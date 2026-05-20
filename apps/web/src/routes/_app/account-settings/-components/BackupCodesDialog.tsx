import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { authClient } from '#/auth'
import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { BackupCodesDisplay, type BackupCodeEntry } from './BackupCodesDisplay'

type Step = 1 | 2

export function BackupCodesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>(1)
  const [password, setPassword] = useState('')
  const [codes, setCodes] = useState<BackupCodeEntry[]>([])
  const [savedCodes, setSavedCodes] = useState(false)

  const viewCodes = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.twoFactor.getBackupCodes({ password })
      if (error) throw new Error(error.message ?? t('twoFactor.backupCodesDialog.errorRetrieve'))
      return data?.codes ?? []
    },
    onSuccess: (fetchedCodes) => {
      setCodes(fetchedCodes)
      setStep(2)
    },
  })

  const regenerate = useMutation({
    mutationFn: async () => {
      const { data, error } = await authClient.twoFactor.regenerateBackupCodes({ password })
      if (error) throw new Error(error.message ?? t('twoFactor.backupCodesDialog.errorRegenerate'))
      return data?.codes ?? []
    },
    onSuccess: (newCodes) => {
      setCodes(newCodes.map((c) => ({ code: c, usedAt: null })))
    },
  })

  function reset() {
    setStep(1)
    setPassword('')
    setCodes([])
    setSavedCodes(false)
    viewCodes.reset()
    regenerate.reset()
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && (details.reason === 'outside-press' || details.reason === 'escape-key'))
          return
        handleOpenChange(nextOpen)
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) reset()
      }}
    >
      <DialogContent className="sm:max-w-[520px]" showCloseButton={!regenerate.isSuccess}>
        <div className="flex justify-center gap-1.5 pt-1">
          {([1, 2] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                'rounded-full transition-all',
                s === step ? 'size-2 bg-foreground' : 'size-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.backupCodesDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('twoFactor.backupCodesDialog.enterPasswordDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="backup-view-password">{t('twoFactor.common.password')}</Label>
              <Input
                id="backup-view-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !viewCodes.isPending) viewCodes.mutate()
                }}
                autoComplete="current-password"
              />
              {viewCodes.error && (
                <p className="text-sm text-destructive">{viewCodes.error.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => viewCodes.mutate()}
                disabled={!password || viewCodes.isPending}
              >
                {viewCodes.isPending
                  ? t('twoFactor.backupCodesDialog.loading')
                  : t('twoFactor.backupCodesDialog.viewCodes')}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>{t('twoFactor.backupCodesDialog.title')}</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Tabs defaultValue="current">
                <TabsList className="w-full">
                  <TabsTrigger value="current" className="flex-1">
                    {t('twoFactor.backupCodesDialog.currentCodes')}
                  </TabsTrigger>
                  <TabsTrigger value="regenerate" className="flex-1">
                    {t('twoFactor.backupCodesDialog.regenerateTab')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="current" className="pt-4">
                  <BackupCodesDisplay codes={codes} />
                </TabsContent>
                <TabsContent value="regenerate" className="pt-4 space-y-4">
                  {!regenerate.isSuccess && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
                      {t('twoFactor.backupCodesDialog.regenerateWarning')}
                    </div>
                  )}
                  {regenerate.isSuccess && <BackupCodesDisplay codes={codes} />}
                  {regenerate.error && (
                    <p className="text-sm text-destructive">{regenerate.error.message}</p>
                  )}
                  {!regenerate.isSuccess && (
                    <Button
                      variant="destructive"
                      onClick={() => regenerate.mutate()}
                      disabled={regenerate.isPending}
                      className="w-full"
                    >
                      {regenerate.isPending
                        ? t('twoFactor.backupCodesDialog.generating')
                        : t('twoFactor.backupCodesDialog.regenerateCodes')}
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            {regenerate.isSuccess && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  id="backup-saved-codes"
                  className="cursor-pointer"
                  checked={savedCodes}
                  onCheckedChange={(c) => setSavedCodes(c === true)}
                />
                <Label htmlFor="backup-saved-codes" className="cursor-pointer">
                  {t('twoFactor.common.savedCodes')}
                </Label>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => handleOpenChange(false)}
                disabled={regenerate.isSuccess && !savedCodes}
              >
                {t('twoFactor.common.done')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
