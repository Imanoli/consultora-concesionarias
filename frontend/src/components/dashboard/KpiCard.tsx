import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatChange } from '@/lib/utils'

interface Props {
  title:           string
  value:           string
  change:          number | null
  positiveIsGood?: boolean   // false para métricas donde menor = mejor (CPL, CPM)
}

export function KpiCard({ title, value, change, positiveIsGood = true }: Props) {
  const isPositive = change !== null && change > 0
  const isGood     = change !== null && (positiveIsGood ? isPositive : !isPositive)
  const isBad      = change !== null && (positiveIsGood ? !isPositive : isPositive) && change !== 0

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {change !== null ? (
          <Badge
            variant="outline"
            className={cn(
              'mt-2 text-xs font-medium',
              isGood && 'border-green-200 bg-green-50 text-green-700',
              isBad  && 'border-red-200 bg-red-50 text-red-700',
              !isGood && !isBad && 'border-gray-200 bg-gray-50 text-gray-600'
            )}
          >
            {isPositive ? '↑' : '↓'} {formatChange(change)} vs período ant.
          </Badge>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Sin período anterior</p>
        )}
      </CardContent>
    </Card>
  )
}
