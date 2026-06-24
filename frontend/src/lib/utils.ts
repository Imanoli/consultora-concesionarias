import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Argentina = UTC-3 fijo (sin DST)
function nowArgentina(): Date {
  const now = new Date()
  return new Date(now.getTime() - 3 * 60 * 60 * 1000)
}

export function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export type DatePreset = 'today' | 'yesterday' | 'last_7d' | 'last_15d' | 'last_30d' | 'this_month' | 'last_month'

export const PRESETS: { value: DatePreset | 'custom'; label: string }[] = [
  { value: 'today',      label: 'Hoy'             },
  { value: 'yesterday',  label: 'Ayer'             },
  { value: 'last_7d',    label: 'Últimos 7 días'   },
  { value: 'last_15d',   label: 'Últimos 15 días'  },
  { value: 'last_30d',   label: 'Últimos 30 días'  },
  { value: 'this_month', label: 'Mes actual'       },
  { value: 'last_month', label: 'Mes anterior'     },
  { value: 'custom',     label: 'Personalizado'    },
]

export function presetToRange(preset: DatePreset): { from: string; to: string } {
  const now   = nowArgentina()
  const ago   = (n: number) => { const d = new Date(now); d.setUTCDate(d.getUTCDate() - n); return d }
  const today = toDateString(now)

  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = toDateString(ago(1))
      return { from: y, to: y }
    }
    case 'last_7d':
      return { from: toDateString(ago(7)),  to: toDateString(ago(1)) }
    case 'last_15d':
      return { from: toDateString(ago(15)), to: toDateString(ago(1)) }
    case 'last_30d':
      return { from: toDateString(ago(30)), to: toDateString(ago(1)) }
    case 'this_month': {
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      return { from: toDateString(first), to: today }
    }
    case 'last_month': {
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      const last  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
      return { from: toDateString(first), to: toDateString(last) }
    }
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatCurrencyARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value)
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatChange(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00.000Z').toLocaleDateString('es-AR', {
    day:      '2-digit',
    month:    'short',
    year:     'numeric',
    timeZone: 'UTC',
  })
}
