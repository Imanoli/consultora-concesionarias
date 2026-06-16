'use client'
import useSWR from 'swr'

interface Insight {
  id:       number
  date:     string
  type:     'anomaly' | 'recommendation' | 'summary'
  severity: 'info' | 'warning' | 'critical'
  title:    string
  body:     string
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/backend'

const severityStyles: Record<string, string> = {
  critical:    'border-red-300    bg-red-50    text-red-900',
  warning:     'border-amber-300  bg-amber-50  text-amber-900',
  info:        'border-blue-200   bg-blue-50   text-blue-900',
}

const typeLabel: Record<string, string> = {
  anomaly:        'Anomalía',
  recommendation: 'Recomendación',
  summary:        'Resumen',
}

function InsightCard({ insight }: { insight: Insight }) {
  const style = severityStyles[insight.severity] ?? severityStyles.info
  return (
    <div className={`rounded-lg border p-3 ${style}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
          {typeLabel[insight.type] ?? insight.type}
        </span>
      </div>
      <p className="text-sm font-semibold leading-tight">{insight.title}</p>
      <p className="text-xs mt-1 opacity-80 leading-relaxed">{insight.body}</p>
    </div>
  )
}

export function AiInsights({ clientId }: { clientId: string }) {
  const { data, isLoading, error } = useSWR<Insight[]>(
    `insights-${clientId}`,
    () => fetch(`${BASE}/api/insights?clientId=${clientId}`).then(r => r.json()),
    { revalidateOnFocus: false },
  )

  if (isLoading) return (
    <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
      Cargando análisis...
    </div>
  )

  if (error || !data || data.length === 0) return null

  // Mostrar solo el último día con insights
  const latestDate = data[0].date
  const latest = data.filter(i => i.date === latestDate)

  // Ordenar: critical → warning → info; summary siempre al final
  const order = { critical: 0, warning: 1, info: 2 }
  const sorted = [...latest].sort((a, b) => {
    if (a.type === 'summary') return 1
    if (b.type === 'summary') return -1
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground px-0.5">
        Análisis IA · {new Date(latestDate + 'T00:00:00Z').toLocaleDateString('es-AR', {
          day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
        })}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2">
        {sorted.map(i => <InsightCard key={i.id} insight={i} />)}
      </div>
    </div>
  )
}
