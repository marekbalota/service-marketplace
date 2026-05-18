import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

interface BackButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export function BackButton({ onClick, label, className }: BackButtonProps) {
  const { t } = useTranslation()
  return (
    <Button variant="ghost" onClick={onClick} className={cn('mb-4 gap-2', className)}>
      <ArrowLeft className="size-4" />
      {label ?? t('common.back')}
    </Button>
  )
}
