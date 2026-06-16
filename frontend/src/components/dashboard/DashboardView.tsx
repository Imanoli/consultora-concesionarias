'use client'
import Image from 'next/image'
import { useState } from 'react'
import useSWR from 'swr'
import { KpiCard }           from './KpiCard'
import { LeadsChart }        from './LeadsChart'
import { CampaignsTable }    from './CampaignsTable'
import { MetricsDetail }     from './MetricsDetail'
import { AiInsights }        from './AiInsights'
import { GoogleAdsSection }  from './GoogleAdsSection'
import { ClaritySection }    from './ClaritySection'
import { Ga4Section }        from './Ga4Section'
import { DateRangeControls } from './DateRangeControls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getMetrics, getDailyMetrics, getCampaigns } from '@/lib/api'
import { presetToRange, formatCurrency, formatNumber, formatPercent, formatDate } from '@/lib/utils'
import { getClientLogo } from '@/lib/clientLogos'

interface Props {
  clientId:                 string
  clientName:               string
  metaFondosUsd:            number | null
  metaFondosUpdatedAt:      string | null
  googleAdsFondosArs:       number | null
  googleAdsFondosUpdatedAt: string | null
}

interface DateRange { from: string; to: string }

export function DashboardView({ clientId, clientName, metaFondosUsd, metaFondosUpdatedAt, googleAdsFondosArs, googleAdsFondosUpdatedAt }: Props) {
  const logo = getClientLogo(clientId)
  const [range, setRange] = useState<DateRange>(() => presetToRange('last_30d'))

  const swrKey = [clientId, range.from, range.to] as const

  const { data: metrics,  isLoading: lM, error: eM } =
    useSWR([...swrKey, 'metrics'],  () => getMetrics({ clientId, from: range.from, to: range.to }))

  const { data: daily,    isLoading: lD } =
    useSWR([...swrKey, 'daily'],    () => getDailyMetrics({ clientId, from: range.from, to: range.to }))

  const { data: campaigns, isLoading: lC } =
    useSWR([...swrKey, 'campaigns'], () => getCampaigns({ clientId, from: range.from, to: range.to }))

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {logo ? (
            <Image
              src={logo}
              alt={clientName}
              width={280}
              height={80}
              className="h-16 w-auto object-contain bg-white rounded-md px-3 py-2"
              priority
            />
          ) : (
            <h1 className="text-xl font-bold">{clientName}</h1>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-0.5">
            <p className="text-sm text-muted-foreground">
              Meta Ads · {formatDate(range.from)} – {formatDate(range.to)}
            </p>
            {metaFondosUsd !== null && (
              <span className={[
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                metaFondosUsd < 40
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : metaFondosUsd < 100
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
              ].join(' ')}>
                Meta · Fondos {formatCurrency(metaFondosUsd)}
              </span>
            )}
            {googleAdsFondosArs !== null && (
              <span className={[
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                googleAdsFondosArs < 50_000
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : googleAdsFondosArs < 100_000
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
              ].join(' ')}>
                Google · Fondos ARS {googleAdsFondosArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        </div>
        <DateRangeControls onRange={setRange} />
      </div>

      {/* Error */}
      {eM && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error al cargar métricas: {(eM as Error).message}
        </div>
      )}

      {/* Separador Meta */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Meta Ads · USD
        </h2>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Inversión"
          value={lM ? '...' : formatCurrency(metrics?.current.spend ?? 0)}
          change={metrics?.change.spend ?? null}
          positiveIsGood={false}
        />
        <KpiCard
          title="Leads"
          value={lM ? '...' : formatNumber(metrics?.current.leads ?? 0)}
          change={metrics?.change.leads ?? null}
        />
        <KpiCard
          title="CPL"
          value={lM ? '...' : (metrics?.current.cpl ? formatCurrency(metrics.current.cpl) : '—')}
          change={metrics?.change.cpl ?? null}
          positiveIsGood={false}
        />
        <KpiCard
          title="CTR"
          value={lM ? '...' : formatPercent(metrics?.current.ctr ?? null)}
          change={metrics?.change.ctr ?? null}
        />
      </div>

      {/* Gráfico de leads */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Tendencia de Leads</CardTitle>
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

      {/* Detalle de métricas */}
      {metrics && (
        <MetricsDetail data={metrics.current} loading={lM} />
      )}

      {/* Tabla de campañas Meta */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Campañas Meta</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          {lC ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <CampaignsTable data={campaigns?.data ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Sección Google Ads */}
      <GoogleAdsSection clientId={clientId} from={range.from} to={range.to} />

      {/* Análisis IA */}
      <AiInsights clientId={clientId} />

      {/* Sección GA4 */}
      <Ga4Section clientId={clientId} from={range.from} to={range.to} />

      {/* Sección Clarity */}
      <ClaritySection clientId={clientId} from={range.from} to={range.to} />

    </div>
  )
}
