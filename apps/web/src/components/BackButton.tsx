import { ArrowLeft } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

interface BackButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export function BackButton({ onClick, label = 'Back', className }: BackButtonProps) {
  return (
    <Button variant="ghost" onClick={onClick} className={cn('mb-4 gap-2', className)}>
      <ArrowLeft className="size-4" />
      {label}
    </Button>
  )
}
