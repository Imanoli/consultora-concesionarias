'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { getMonthlyMetrics, getAllCampaigns, type MonthlyMetric } from '@/lib/api'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Traducciones de objetivos Meta → español
const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC:       'Tráfico',
  OUTCOME_ENGAGEMENT:    'Interacción',
  OUTCOME_SALES:         'Ventas',
  OUTCOME_LEADS:         'Leads',
  OUTCOME_AWARENESS:     'Reconocimiento',
  OUTCOME_APP_PROMOTION: 'App',
  LINK_CLICKS:           'Tráfico',
  POST_ENGAGEMENT:       'Interacción',
  CONVERSIONS:           'Conversiones',
  LEAD_GENERATION:       'Generación de leads',
}

function objectiveLabel(obj: string | null): string {
  if (!obj) return 'Sin objetivo'
  return OBJECTIVE_LABELS[obj] ?? obj
}

function fmtCurrency(v: number) {
  return v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(v: number | null) {
  if (v === null) return '—'
  return `${(v * 100).toFixed(2)}%`
}
function fmtNum(v: number) { return v.toLocaleString('es-AR') }

interface ColDef { key: keyof MonthlyMetric; header: string; fmt: (v: number | null) => string }

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

interface Props { clientId: string; source: 'meta' | 'google_ads'; title: string }

export function MonthlyComparisonTable({ clientId, source, title }: Props) {
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { data: campaigns = [] } = useSWR(
    ['campaigns-all', clientId, source],
    () => getAllCampaigns({ clientId, source })
  )

  const { data, isLoading } = useSWR(
    ['monthly', clientId, source, selectedObjective ?? ''],
    () => getMonthlyMetrics({ clientId, source, months: 12, objective: selectedObjective ?? undefined })
  )

  // Objetivos únicos disponibles en las campañas
  const objectives = Array.from(new Set(campaigns.map(c => c.objective).filter(Boolean))) as string[]

  const cols = buildCols(source)

  if (!isLoading && (!data || data.length === 0) && !selectedObjective) return null

  const filterLabel = selectedObjective ? objectiveLabel(selectedObjective) : 'Todos los objetivos'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>

        {objectives.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors"
            >
              {filterLabel} ▾
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-7 z-20 bg-background border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
                <button
                  onClick={() => { setSelectedObjective(null); setDropdownOpen(false) }}
                  className={`w-full text-left text-xs px-3 py-2 hover:bg-muted/40 transition-colors ${!selectedObjective ? 'font-medium' : ''}`}
                >
                  Todos los objetivos
                </button>
                {objectives.map(obj => (
                  <button
                    key={obj}
                    onClick={() => { setSelectedObjective(obj); setDropdownOpen(false) }}
                    className={`w-full text-left text-xs px-3 py-2 hover:bg-muted/40 transition-colors ${selectedObjective === obj ? 'font-medium' : ''}`}
                  >
                    {objectiveLabel(obj)}
                  </button>
                ))}
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
              : !data || data.length === 0
              ? (
                  <tr>
                    <td colSpan={cols.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                      Sin datos para este objetivo
                    </td>
                  </tr>
                )
              : data.map(row => (
                  <tr key={`${row.year}-${row.month}`} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      {MONTHS[row.month - 1]} {row.year}
                    </td>
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
