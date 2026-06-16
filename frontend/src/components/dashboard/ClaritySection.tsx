'use client'
import useSWR from 'swr'
import { KpiCard } from './KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getClarityData } from '@/lib/api'
import { formatNumber } from '@/lib/utils'

interface Props {
  clientId: string
  from:     string
  to:       string
}

function fmtTime(secs: number): string {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function ClaritySection({ clientId, from, to }: Props) {
  const { data, isLoading } =
    useSWR([clientId, from, to, 'clarity'], () => getClarityData({ clientId, from, to }))

  if (!isLoading && (!data || !data.summary || data.summary.totalSessions === 0)) return null

  const s = data?.summary

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Microsoft Clarity · Web
        </h2>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="Sesiones"
          value={isLoading ? '...' : formatNumber(s?.totalSessions ?? 0)}
          change={null}
        />
        <KpiCard
          title="Vistas de página"
          value={isLoading ? '...' : formatNumber(s?.totalPageViews ?? 0)}
          change={null}
        />
        <KpiCard
          title="Scroll promedio"
          value={isLoading ? '...' : `${s?.avgScrollDepth ?? 0}%`}
          change={null}
        />
        <KpiCard
          title="T. activo / sesión"
          value={isLoading ? '...' : (s ? fmtTime(Math.round(s.activeTimeSec / Math.max(s.totalSessions, 1))) : '—')}
          change={null}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Dispositivos y UX */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Comportamiento</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2 text-sm">
            {isLoading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Móvil</span>
                  <span className="font-medium">{s?.mobilePercent ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rage clicks</span>
                  <span className={`font-medium ${(s?.rageClicks ?? 0) > 0 ? 'text-amber-600' : ''}`}>
                    {s?.rageClicks ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dead clicks</span>
                  <span className={`font-medium ${(s?.deadClicks ?? 0) > 5 ? 'text-amber-600' : ''}`}>
                    {s?.deadClicks ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usuarios únicos</span>
                  <span className="font-medium">{formatNumber(s?.distinctUsers ?? 0)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Páginas más vistas */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Páginas populares</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1 text-sm">
            {isLoading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : (
              (data?.pages ?? []).map((p, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate max-w-[180px]" title={p.url}>
                    {p.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                  </span>
                  <span className="font-medium shrink-0">{p.visitsCount}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
