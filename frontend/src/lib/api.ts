import type { Client, MetricsResponse, DailyMetricsResponse, CampaignsResponse } from '@/types/metrics'

// Server-side (Vercel SSR): BACKEND_URL es absoluta y no necesita rewrite
// Client-side (browser): NEXT_PUBLIC_API_URL o '/backend' → rewrite de Next.js al VPS
const BASE = typeof window === 'undefined'
  ? (process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '')
  : (process.env.NEXT_PUBLIC_API_URL ?? '/backend')

interface RangeParams {
  clientId: string
  source?:  string
  from:     string
  to:       string
}

async function apiFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function getClients(): Promise<Client[]> {
  const res = await fetch(`${BASE}/api/clients`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Error al cargar clientes')
  return res.json() as Promise<Client[]>
}

export async function getMetrics(p: RangeParams): Promise<MetricsResponse> {
  return apiFetch<MetricsResponse>('/api/metrics', {
    clientId: p.clientId,
    source:   p.source ?? 'meta',
    from:     p.from,
    to:       p.to,
  })
}

export async function getDailyMetrics(p: RangeParams): Promise<DailyMetricsResponse> {
  return apiFetch<DailyMetricsResponse>('/api/metrics/daily', {
    clientId: p.clientId,
    source:   p.source ?? 'meta',
    from:     p.from,
    to:       p.to,
  })
}

export async function getCampaigns(p: RangeParams): Promise<CampaignsResponse> {
  return apiFetch<CampaignsResponse>('/api/campaigns', {
    clientId: p.clientId,
    source:   p.source ?? 'meta',
    from:     p.from,
    to:       p.to,
  })
}

export interface ClarityResponse {
  period:  { from: string; to: string }
  summary: {
    totalSessions:  number
    totalPageViews: number
    distinctUsers:  number
    avgScrollDepth: number
    totalTimeSec:   number
    activeTimeSec:  number
    rageClicks:     number
    deadClicks:     number
    mobilePercent:  number
  }
  devices:   Array<{ name: string; sessions: number }>
  countries: Array<{ name: string; sessions: number }>
  pages:     Array<{ url: string; visitsCount: number }>
  data:      Array<{ date: string; sessions: number; pageViews: number }>
}

export async function getClarityData(p: { clientId: string; from: string; to: string }): Promise<ClarityResponse> {
  return apiFetch<ClarityResponse>('/api/clarity', { clientId: p.clientId, from: p.from, to: p.to })
}

export async function getGa4Metrics(p: RangeParams): Promise<MetricsResponse> {
  return apiFetch<MetricsResponse>('/api/metrics', {
    clientId: p.clientId,
    source:   'ga4',
    from:     p.from,
    to:       p.to,
  })
}

export async function getGa4DailyMetrics(p: RangeParams): Promise<DailyMetricsResponse> {
  return apiFetch<DailyMetricsResponse>('/api/metrics/daily', {
    clientId: p.clientId,
    source:   'ga4',
    from:     p.from,
    to:       p.to,
  })
}
