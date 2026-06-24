import type { Client, MetricsResponse, DailyMetricsResponse, CampaignsResponse } from '@/types/metrics'

// Dev: NEXT_PUBLIC_API_URL=http://localhost:3001 (directo al backend local)
// Prod: BASE='/backend' → rewrites de Next.js enrutan /backend/* al VPS
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/backend'

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

export interface RevenueEntry {
  amountArs:  number | null
  usdArsRate: number | null
  notes:      string | null
}

export async function getRevenue(p: { clientId: string; year: number; month: number }): Promise<RevenueEntry> {
  return apiFetch<RevenueEntry>('/api/revenue', {
    clientId: p.clientId,
    year:     String(p.year),
    month:    String(p.month),
  })
}

export interface MonthlyMetric {
  year:             number
  month:            number
  spend:            number
  impressions:      number
  clicks:           number
  leads:            number
  reach:            number
  linkClicks:       number
  purchases:        number
  instagramFollows: number
  ctr:              number | null
  cpm:              number | null
  cpl:              number | null
  cpc:              number | null
}

export async function getMonthlyMetrics(p: { clientId: string; source: string; months?: number; campaignIds?: string[] }): Promise<MonthlyMetric[]> {
  const params: Record<string, string> = {
    clientId: p.clientId,
    source:   p.source,
    months:   String(p.months ?? 12),
  }
  if (p.campaignIds && p.campaignIds.length > 0) {
    params.campaignIds = p.campaignIds.join(',')
  }
  return apiFetch<MonthlyMetric[]>('/api/metrics/monthly', params)
}

export interface CampaignSummary {
  campaignId:   string
  campaignName: string
}

export async function getAllCampaigns(p: { clientId: string; source: string }): Promise<CampaignSummary[]> {
  return apiFetch<CampaignSummary[]>('/api/campaigns/all', {
    clientId: p.clientId,
    source:   p.source,
  })
}

export async function saveRevenue(p: {
  clientId:   string
  year:       number
  month:      number
  amountArs:  number
  usdArsRate: number
  notes?:     string
}): Promise<{ ok: boolean }> {
  const url = `${BASE}/api/revenue`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(p),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  return res.json() as Promise<{ ok: boolean }>
}
