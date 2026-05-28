import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

interface StatCardProps {
  label: string
  value: string
  isPending?: boolean
  icon?: LucideIcon
  iconBg?: string
  iconText?: string
}

export function StatCard({ label, value, isPending, icon: Icon, iconBg, iconText }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {isPending ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
          {Icon && (
            <div className={cn('p-3 rounded-lg', iconBg)}>
              <Icon className={cn('size-5', iconText)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
