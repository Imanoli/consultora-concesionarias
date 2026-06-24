'use client'
import useSWR from 'swr'
import { getMonthlyMetrics, type MonthlyMetric } from '@/lib/api'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function label(r: MonthlyMetric) {
  return `${MONTHS[r.month - 1]} ${r.year}`
}

function fmtCurrency(v: number, decimals = 0) {
  return v.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtPct(v: number | null) {
  if (v === null) return '—'
  return `${(v * 100).toFixed(2)}%`
}

function fmtNum(v: number) {
  return v.toLocaleString('es-AR')
}

interface ColDef {
  key:    keyof MonthlyMetric
  header: string
  fmt:    (v: number | null) => string
}

function buildCols(source: string): ColDef[] {
  const currency = source === 'meta' ? 'USD' : 'ARS'
  return [
    { key: 'spend',       header: `Inversión ${currency}`, fmt: v => v !== null ? `$${fmtCurrency(v, 2)}` : '—' },
    { key: 'impressions', header: 'Impresiones',           fmt: v => v !== null ? fmtNum(v) : '—' },
    { key: 'leads',       header: source === 'google_ads' ? 'Conversiones' : 'Leads', fmt: v => v !== null ? fmtNum(v) : '—' },
    { key: 'cpl',         header: source === 'google_ads' ? `Costo/Conv. ${currency}` : `CPL ${currency}`, fmt: v => v !== null ? `$${fmtCurrency(v, 2)}` : '—' },
    { key: 'cpm',         header: `CPM ${currency}`,       fmt: v => v !== null ? `$${fmtCurrency(v, 2)}` : '—' },
    { key: 'ctr',         header: 'CTR',                   fmt: fmtPct },
    { key: 'clicks',      header: 'Clics',                 fmt: v => v !== null ? fmtNum(v) : '—' },
    { key: 'cpc',         header: `CPC ${currency}`,       fmt: v => v !== null ? `$${fmtCurrency(v, 2)}` : '—' },
  ]
}

interface Props {
  clientId: string
  source:   'meta' | 'google_ads'
  title:    string
}

export function MonthlyComparisonTable({ clientId, source, title }: Props) {
  const { data, isLoading } = useSWR(
    ['monthly', clientId, source],
    () => getMonthlyMetrics({ clientId, source, months: 12 })
  )

  const cols = buildCols(source)

  if (!isLoading && (!data || data.length === 0)) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Mes</th>
              {cols.map(c => (
                <th key={c.key} className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">...</td>
                    {cols.map(c => <td key={c.key} className="px-3 py-2 text-right text-muted-foreground">...</td>)}
                  </tr>
                ))
              : data!.map(row => (
                  <tr key={`${row.year}-${row.month}`} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{label(row)}</td>
                    {cols.map(c => (
                      <td key={c.key} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                        {c.fmt(row[c.key] as number | null)}
                      </td>
                    ))}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
