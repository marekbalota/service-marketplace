import { Monitor, Smartphone, Tablet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { UAParser } from 'ua-parser-js'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'

type Session = {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
  expiresAt: Date | string
  ipAddress: string | null
  userAgent: string | null
}

type Props = {
  session: Session
  isCurrent: boolean
  isImpersonating?: boolean
  onRevoke: (id: string) => void
}

function parseDevice(userAgent: string | null, fallbackLabel: string) {
  if (!userAgent) {
    return { label: fallbackLabel, DeviceIcon: Monitor, testId: 'device-icon-desktop' }
  }
  const parser = new UAParser(userAgent)
  const browser = parser.getBrowser().name ?? 'Unknown'
  const os = parser.getOS().name ?? 'Unknown'
  const deviceType = parser.getDevice().type

  let DeviceIcon: typeof Monitor
  let testId: string
  if (deviceType === 'mobile') {
    DeviceIcon = Smartphone
    testId = 'device-icon-mobile'
  } else if (deviceType === 'tablet') {
    DeviceIcon = Tablet
    testId = 'device-icon-tablet'
  } else {
    DeviceIcon = Monitor
    testId = 'device-icon-desktop'
  }

  return { label: `${browser} on ${os}`, DeviceIcon, testId }
}


export function SessionRow({ session, isCurrent, isImpersonating = false, onRevoke }: Props) {
  const { t, i18n } = useTranslation()
  const { label, DeviceIcon, testId } = parseDevice(
    session.userAgent,
    t('accountSettings.sessions.unknownBrowser'),
  )
  const createdAt = new Date(session.createdAt)

  const signedInDate = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(createdAt)

  const ip = session.ipAddress ?? '—'

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <div className="size-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
        <DeviceIcon className="size-[18px] text-muted-foreground" data-testid={testId} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-medium">{label}</span>
          {isCurrent && (
            <Badge className="bg-active-bg text-active-fg border-transparent">
              {t('accountSettings.sessions.thisDevice')}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('accountSettings.sessions.sessionMeta', {
            signedIn: signedInDate,
            ip,
          })}
        </p>
      </div>

      {isCurrent ? (
        <Button variant="outline" size="sm" disabled className="shrink-0 text-muted-foreground">
          {t('accountSettings.sessions.current')}
        </Button>
      ) : isImpersonating ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <span tabIndex={0} className="inline-flex shrink-0">
                <Button variant="destructive" size="sm" disabled>
                  {t('accountSettings.sessions.revoke')}
                </Button>
              </span>
            }
          />
          <TooltipContent>{t('accountSettings.impersonationRestricted')}</TooltipContent>
        </Tooltip>
      ) : (
        <Button
          variant="destructive"
          size="sm"
          className="shrink-0"
          onClick={() => onRevoke(session.id)}
        >
          {t('accountSettings.sessions.revoke')}
        </Button>
      )}
    </div>
  )
}
