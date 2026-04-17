import { Card, CardContent } from '#/components/ui/card'

interface StatCardProps {
  value: string | number
  label: string
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
