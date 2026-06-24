'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { getMonthlyMetrics, getAllCampaigns, type MonthlyMetric } from '@/lib/api'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function label(r: MonthlyMetric) {
  return `${MONTHS[r.month - 1]} ${r.year}`
}

function fmtCurrency(v: number) {
  return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
    { key: 'spend',       header: `Inversión ${currency}`, fmt: v => v !== null ? `$${fmtCurrency(v)}` : '—' },
    { key: 'impressions', header: 'Impresiones',           fmt: v => v !== null ? fmtNum(v) : '—' },
    { key: 'leads',       header: source === 'google_ads' ? 'Conversiones' : 'Leads', fmt: v => v !== null ? fmtNum(v) : '—' },
    { key: 'cpl',         header: source === 'google_ads' ? `Costo/Conv. ${currency}` : `CPL ${currency}`, fmt: v => v !== null ? `$${fmtCurrency(v)}` : '—' },
    { key: 'cpm',         header: `CPM ${currency}`,       fmt: v => v !== null ? `$${fmtCurrency(v)}` : '—' },
    { key: 'ctr',         header: 'CTR',                   fmt: fmtPct },
    { key: 'clicks',      header: 'Clics',                 fmt: v => v !== null ? fmtNum(v) : '—' },
    { key: 'cpc',         header: `CPC ${currency}`,       fmt: v => v !== null ? `$${fmtCurrency(v)}` : '—' },
  ]
}

interface Props {
  clientId: string
  source:   'meta' | 'google_ads'
  title:    string
}

export function MonthlyComparisonTable({ clientId, source, title }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterOpen,  setFilterOpen]  = useState(false)

  const { data: campaigns = [] } = useSWR(
    ['campaigns-all', clientId, source],
    () => getAllCampaigns({ clientId, source })
  )

  const { data, isLoading } = useSWR(
    ['monthly', clientId, source, selectedIds.join(',')],
    () => getMonthlyMetrics({ clientId, source, months: 12, campaignIds: selectedIds.length > 0 ? selectedIds : undefined })
  )

  const cols = buildCols(source)

  if (!isLoading && (!data || data.length === 0)) return null

  function toggleCampaign(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function clearFilter() {
    setSelectedIds([])
    setFilterOpen(false)
  }

  const filterLabel = selectedIds.length === 0
    ? 'Todas las campañas'
    : `${selectedIds.length} campaña${selectedIds.length > 1 ? 's' : ''} seleccionada${selectedIds.length > 1 ? 's' : ''}`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>

        {campaigns.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setFilterOpen(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
            >
              {filterLabel} ▾
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-7 z-20 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[240px] space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Filtrar campañas</span>
                  <button onClick={clearFilter} className="text-xs text-muted-foreground hover:text-foreground">
                    Limpiar
                  </button>
                </div>
                {campaigns.map(c => (
                  <label key={c.campaignId} className="flex items-start gap-2 cursor-pointer hover:bg-muted/30 rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.campaignId)}
                      onChange={() => toggleCampaign(c.campaignId)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-xs leading-tight">{c.campaignName}</span>
                  </label>
                ))}
                <button
                  onClick={() => setFilterOpen(false)}
                  className="mt-2 w-full text-xs bg-blue-600 text-white rounded-md py-1 hover:bg-blue-700 transition-colors"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
