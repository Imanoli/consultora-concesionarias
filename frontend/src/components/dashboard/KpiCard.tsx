import { cn, formatChange } from '@/lib/utils'

interface Props {
  title:           string
  value:           string
  change:          number | null
  positiveIsGood?: boolean
}

export function KpiCard({ title, value, change, positiveIsGood = true }: Props) {
  const isPositive = change !== null && change > 0
  const isGood     = change !== null && (positiveIsGood ? isPositive : !isPositive)
  const isBad      = change !== null && (positiveIsGood ? !isPositive : isPositive) && change !== 0

  return (
    <div className="relative rounded-xl border border-white/8 bg-card p-5 overflow-hidden">
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>

      {change !== null ? (
        <div className={cn(
          'mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
          isGood && 'bg-emerald-500/15 text-emerald-400',
          isBad  && 'bg-red-500/15 text-red-400',
          !isGood && !isBad && 'bg-white/8 text-muted-foreground',
        )}>
          <span>{isPositive ? '▲' : '▼'}</span>
          <span>{formatChange(change)} vs período ant.</span>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">Sin período anterior</p>
      )}
    </div>
  )
}
