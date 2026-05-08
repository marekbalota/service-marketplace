import type { LucideIcon } from 'lucide-react'
import { FieldLabel } from '#/components/ui/field'

export function FieldIconHeader({
  icon: Icon,
  iconBgClassName,
  iconClassName,
  label,
  htmlFor,
}: {
  icon: LucideIcon
  iconBgClassName: string
  iconClassName: string
  label: string
  htmlFor?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconBgClassName}`}>
        <Icon className={`size-5 ${iconClassName}`} />
      </div>
      <FieldLabel htmlFor={htmlFor} className="text-base font-semibold">{label}</FieldLabel>
    </div>
  )
}
