import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import type { KpiSet } from '@/types/metrics'

interface Props {
  data:      KpiSet
  loading:   boolean
}

interface MetricRow {
  label: string
  value: string
}

function buildRows(d: KpiSet): MetricRow[] {
  return [
    { label: 'Importe gastado',         value: formatCurrency(d.spend) },
    { label: 'Impresiones',             value: formatNumber(d.impressions) },
    { label: 'Alcance',                 value: formatNumber(d.reach) },
    { label: 'Frecuencia',              value: d.frequency != null ? d.frequency.toFixed(2) + 'x' : '—' },
    { label: 'Clics (total)',           value: formatNumber(d.clicks) },
    { label: 'Clics en enlace',         value: formatNumber(d.linkClicks) },
    { label: 'CTR',                     value: formatPercent(d.ctr) },
    { label: 'CPC',                     value: d.cpc   != null ? formatCurrency(d.cpc)   : '—' },
    { label: 'CPM',                     value: d.cpm   != null ? formatCurrency(d.cpm)   : '—' },
    { label: 'Resultados',              value: formatNumber(d.leads) },
    { label: 'CPR',                      value: d.cpl   != null ? formatCurrency(d.cpl)   : '—' },
    { label: 'Compras',                 value: formatNumber(d.purchases) },
    { label: 'Costo x Compra',          value: d.costPerPurchase != null ? formatCurrency(d.costPerPurchase) : '—' },
    { label: 'Seguimientos Instagram',  value: formatNumber(d.instagramFollows) },
    { label: 'Costo x Seguidor',        value: d.costPerFollower != null ? formatCurrency(d.costPerFollower) : '—' },
  ]
}

export function MetricsDetail({ data, loading }: Props) {
  const rows = buildRows(data)

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">Detalle de métricas</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
            {rows.map(r => (
              <div key={r.label} className="py-1.5">
                <p className="text-xs text-muted-foreground leading-tight">{r.label}</p>
                <p className="text-sm font-semibold tabular-nums mt-0.5">{r.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
