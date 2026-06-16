'use client'
import useSWR from 'swr'
import { KpiCard }       from './KpiCard'
import { LeadsChart }    from './LeadsChart'
import { CampaignsTable } from './CampaignsTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getMetrics, getDailyMetrics, getCampaigns } from '@/lib/api'
import { formatCurrencyARS, formatNumber, formatPercent } from '@/lib/utils'

interface Props {
  clientId: string
  from:     string
  to:       string
}

export function GoogleAdsSection({ clientId, from, to }: Props) {
  const key = [clientId, from, to, 'google_ads'] as const

  const { data: metrics,   isLoading: lM } =
    useSWR([...key, 'metrics'],   () => getMetrics({ clientId, source: 'google_ads', from, to }))
  const { data: daily,     isLoading: lD } =
    useSWR([...key, 'daily'],     () => getDailyMetrics({ clientId, source: 'google_ads', from, to }))
  const { data: campaigns, isLoading: lC } =
    useSWR([...key, 'campaigns'], () => getCampaigns({ clientId, source: 'google_ads', from, to }))

  // No mostrar la sección si no hay datos
  if (!lM && (!metrics || metrics.current.impressions === 0)) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Google Ads · ARS
        </h2>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Inversión"
          value={lM ? '...' : formatCurrencyARS(metrics?.current.spend ?? 0)}
          change={metrics?.change.spend ?? null}
          positiveIsGood={false}
        />
        <KpiCard
          title="Conversiones"
          value={lM ? '...' : formatNumber(metrics?.current.leads ?? 0)}
          change={metrics?.change.leads ?? null}
        />
        <KpiCard
          title="Costo/Conv."
          value={lM ? '...' : (metrics?.current.cpl ? formatCurrencyARS(metrics.current.cpl) : '—')}
          change={metrics?.change.cpl ?? null}
          positiveIsGood={false}
        />
        <KpiCard
          title="CTR"
          value={lM ? '...' : formatPercent(metrics?.current.ctr ?? null)}
          change={metrics?.change.ctr ?? null}
        />
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Conversiones Google Ads</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {lD ? (
            <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <LeadsChart data={daily?.data ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Tabla de campañas */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Campañas Google Ads</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {lC ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <CampaignsTable data={campaigns?.data ?? []} currencyFormatter={formatCurrencyARS} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
