'use client'
import useSWR from 'swr'
import { KpiCard }    from './KpiCard'
import { LeadsChart } from './LeadsChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getGa4Metrics, getGa4DailyMetrics } from '@/lib/api'
import { formatNumber } from '@/lib/utils'

interface Props {
  clientId: string
  from:     string
  to:       string
}

export function Ga4Section({ clientId, from, to }: Props) {
  const key = [clientId, from, to, 'ga4'] as const

  const { data: metrics, isLoading: lM } =
    useSWR([...key, 'metrics'], () => getGa4Metrics({ clientId, from, to }))
  const { data: daily, isLoading: lD } =
    useSWR([...key, 'daily'],   () => getGa4DailyMetrics({ clientId, from, to }))

  if (!lM && (!metrics || metrics.current.sessions === 0)) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Google Analytics 4 · Web
        </h2>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Sesiones"
          value={lM ? '...' : formatNumber(metrics?.current.sessions ?? 0)}
          change={metrics?.change.sessions ?? null}
        />
        <KpiCard
          title="Usuarios"
          value={lM ? '...' : formatNumber(metrics?.current.clicks ?? 0)}
          change={metrics?.change.clicks ?? null}
        />
        <KpiCard
          title="Páginas vistas"
          value={lM ? '...' : formatNumber(metrics?.current.impressions ?? 0)}
          change={metrics?.change.impressions ?? null}
        />
        <KpiCard
          title="Sesiones activas"
          value={lM ? '...' : formatNumber(metrics?.current.conversions ?? 0)}
          change={metrics?.change.conversions ?? null}
        />
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Páginas vistas diarias</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {lD ? (
            <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <LeadsChart
              data={(daily?.data ?? []).map(d => ({ ...d, leads: d.impressions }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
