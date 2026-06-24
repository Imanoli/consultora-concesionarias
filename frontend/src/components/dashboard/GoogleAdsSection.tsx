'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { KpiCard }        from './KpiCard'
import { LeadsChart }     from './LeadsChart'
import { CampaignsTable } from './CampaignsTable'
import { FundLoadModal }  from './FundLoadModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getMetrics, getDailyMetrics, getCampaigns } from '@/lib/api'
import { formatCurrencyARS, formatNumber, formatPercent } from '@/lib/utils'

interface Props {
  clientId:  string
  from:      string
  to:        string
  fondosArs: number | null
  isAdmin:   boolean
}

function fondosBadgeClass(value: number): string {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium'
  if (value < 50_000)  return `${base} bg-red-500/15 text-red-400 border-red-500/30`
  if (value < 100_000) return `${base} bg-amber-500/15 text-amber-400 border-amber-500/30`
  return `${base} bg-emerald-500/15 text-emerald-400 border-emerald-500/30`
}

export function GoogleAdsSection({ clientId, from, to, fondosArs, isAdmin }: Props) {
  const [modal, setModal] = useState(false)
  const key = [clientId, from, to, 'google_ads'] as const

  const { data: metrics,   isLoading: lM } =
    useSWR([...key, 'metrics'],   () => getMetrics({ clientId, source: 'google_ads', from, to }))
  const { data: daily,     isLoading: lD } =
    useSWR([...key, 'daily'],     () => getDailyMetrics({ clientId, source: 'google_ads', from, to }))
  const { data: campaigns, isLoading: lC } =
    useSWR([...key, 'campaigns'], () => getCampaigns({ clientId, source: 'google_ads', from, to }))

  if (!lM && (!metrics || metrics.current.impressions === 0)) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Google Ads · ARS
        </h2>
        {fondosArs !== null && fondosArs > 0 && (
          <span className={fondosBadgeClass(fondosArs)}>
            Fondos ARS {fondosArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </span>
        )}
        {isAdmin && (
          <button
            onClick={() => setModal(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            + Cargar saldo
          </button>
        )}
        <div className="flex-1 border-t border-border" />
      </div>

      {isAdmin && (
        <FundLoadModal
          open={modal}
          clientId={clientId}
          source="google_ads"
          currency="ARS"
          onClose={() => setModal(false)}
        />
      )}

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
