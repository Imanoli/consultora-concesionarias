'use client'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { formatDate } from '@/lib/utils'
import type { DailyDataPoint } from '@/types/metrics'

interface Props {
  data: DailyDataPoint[]
}

interface TooltipProps {
  active?:  boolean
  payload?: Array<{ value: number }>
  label?:   string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1f2e] px-3 py-2 shadow-xl">
      <p className="text-[11px] text-muted-foreground mb-1">
        {label ? formatDate(label) : ''}
      </p>
      <p className="text-sm font-semibold text-white">{payload[0].value} leads</p>
    </div>
  )
}

export function LeadsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Sin datos para el período seleccionado
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={d => {
            const parts = (d as string).split('-')
            return `${parseInt(parts[2])}/${parseInt(parts[1])}`
          }}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="leads"
          stroke="#6366F1"
          strokeWidth={2}
          fill="url(#leadsGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
