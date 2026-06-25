import { createHmac } from 'crypto'

export interface MetaAction {
  action_type: string
  value:       string
}

export interface MetaCampaignInsight {
  campaign_id:        string
  campaign_name:      string
  date_start:         string
  date_stop:          string
  spend:              string
  impressions:        string
  clicks:             string
  reach:              string
  frequency:          string
  cpm:                string
  cpc:                string
  ctr:                string
  inline_link_clicks: string
  actions?:           MetaAction[]
  unique_actions?:    MetaAction[]
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly subcode?: number,
    public readonly fbtraceId?: string,
  ) {
    super(message)
    this.name = 'MetaApiError'
  }
}

interface MetaErrorBody {
  message:        string
  type:           string
  code:           number
  error_subcode?: number
  fbtrace_id?:    string
}

function requireEnv(clientId?: string) {
  const suffix  = clientId?.toUpperCase()
  const token   = (suffix && process.env[`META_ACCESS_TOKEN_${suffix}`]) || process.env.META_ACCESS_TOKEN
  const secret  = (suffix && process.env[`META_APP_SECRET_${suffix}`])   || process.env.META_APP_SECRET
  const version = process.env.META_GRAPH_API_VERSION ?? 'v21.0'
  if (!token || !secret) {
    throw new Error(`Faltan variables: META_ACCESS_TOKEN${suffix ? `_${suffix}` : ''} o META_APP_SECRET${suffix ? `_${suffix}` : ''}`)
  }
  return { token, secret, version }
}

function computeProof(secret: string, token: string): string {
  return createHmac('sha256', secret).update(token).digest('hex')
}

function assertNoError(body: Record<string, unknown>): void {
  if (!body['error']) return
  const e = body['error'] as MetaErrorBody
  const messages: Record<number, string> = {
    190: 'Token inválido o expirado',
    17:  'Rate limit — reintentar más tarde',
    32:  'Rate limit — reintentar más tarde',
    613: 'Rate limit — reintentar más tarde',
    368: 'Cuenta bloqueada por políticas de Meta',
  }
  throw new MetaApiError(
    messages[e.code] ?? e.message,
    e.code,
    e.error_subcode,
    e.fbtrace_id,
  )
}

function buildUrl(base: string, account: string, token: string, proof: string, date: string): string {
  const u = new URL(`${base}/${account}/insights`)
  u.searchParams.set('level',                           'campaign')
  u.searchParams.set('fields',                          'campaign_id,campaign_name,spend,impressions,clicks,reach,frequency,cpm,cpc,ctr,inline_link_clicks,actions,unique_actions')
  u.searchParams.set('time_increment',                  '1')
  u.searchParams.set('time_range',                      JSON.stringify({ since: date, until: date }))
  u.searchParams.set('use_account_attribution_setting', 'true')
  u.searchParams.set('limit',                           '100')
  u.searchParams.set('appsecret_proof',                 proof)
  u.searchParams.set('access_token',                    token)
  return u.toString()
}

export async function fetchCampaignInsights(date: string, accountId: string, clientId?: string): Promise<MetaCampaignInsight[]> {
  const { token, secret, version } = requireEnv(clientId)
  const proof   = computeProof(secret, token)
  const base    = `https://graph.facebook.com/${version}`
  const results: MetaCampaignInsight[] = []

  let url: string | null = buildUrl(base, accountId, token, proof, date)

  while (url) {
    const res  = await fetch(url)
    const body = await res.json() as Record<string, unknown>
    assertNoError(body)

    const page = body as {
      data:    MetaCampaignInsight[]
      paging?: { next?: string }
    }
    results.push(...(page.data ?? []))
    url = page.paging?.next ?? null
  }

  return results
}

export interface MetaCampaignInfo {
  id:        string
  name:      string
  objective: string
}

export async function fetchCampaignObjectives(accountId: string, clientId?: string): Promise<Map<string, string>> {
  const { token, secret, version } = requireEnv(clientId)
  const proof = computeProof(secret, token)
  const base  = `https://graph.facebook.com/${version}`

  const map = new Map<string, string>()
  let url: string | null = `${base}/${accountId}/campaigns?fields=id,objective&limit=200&appsecret_proof=${proof}&access_token=${token}`

  while (url) {
    const res  = await fetch(url)
    const body = await res.json() as Record<string, unknown>
    assertNoError(body)
    const page = body as { data: MetaCampaignInfo[]; paging?: { next?: string } }
    for (const c of page.data ?? []) map.set(c.id, c.objective)
    url = page.paging?.next ?? null
  }

  return map
}
