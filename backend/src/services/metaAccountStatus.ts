import { createHmac } from 'crypto'

export interface AccountStatus {
  // fondosDisponibles = umbral_facturación - gasto_ciclo_actual (en USD)
  fondosDisponibles: number
  currency:          string
  campaigns:         CampaignStatus[]
}

export interface CampaignStatus {
  id:               string
  name:             string
  status:           string   // ACTIVE | PAUSED | etc.
  effectiveStatus:  string   // ACTIVE | PAUSED | WITH_ISSUES | etc.
}

function getEnv(accountId?: string) {
  const token   = process.env.META_ACCESS_TOKEN
  const secret  = process.env.META_APP_SECRET
  const version = process.env.META_GRAPH_API_VERSION ?? 'v21.0'
  const account = accountId ?? process.env.META_AD_ACCOUNT_ID
  if (!token || !secret || !account) {
    throw new Error('Faltan META_ACCESS_TOKEN, META_APP_SECRET o META_AD_ACCOUNT_ID')
  }
  return { token, secret, version, account }
}

function proof(secret: string, token: string): string {
  return createHmac('sha256', secret).update(token).digest('hex')
}

function assertNoError(body: Record<string, unknown>): void {
  if (!body['error']) return
  const e = body['error'] as { message: string; code: number }
  throw new Error(`Meta API error ${e.code}: ${e.message}`)
}

export async function fetchAccountStatus(accountId?: string): Promise<AccountStatus> {
  const { token, secret, version, account } = getEnv(accountId)
  const ap = proof(secret, token)
  const base = `https://graph.facebook.com/${version}`

  // funding_source_details.balance = fondos prepagos disponibles (en centavos)
  // balance = saldo de facturación corriente (lo que se adeuda), no el fondo
  const balanceUrl = new URL(`${base}/${account}`)
  balanceUrl.searchParams.set('fields', 'balance,currency,funding_source_details')
  balanceUrl.searchParams.set('appsecret_proof', ap)
  balanceUrl.searchParams.set('access_token', token)

  const balanceRes  = await fetch(balanceUrl.toString())
  const balanceBody = await balanceRes.json() as Record<string, unknown>
  assertNoError(balanceBody)

  const currency = String(balanceBody['currency'] ?? 'USD')

  // balance = gasto acumulado del ciclo actual (en centavos).
  // Meta es postpago: cobra cuando el gasto alcanza el umbral de facturación.
  // "Fondos disponibles" = umbral - balance
  const balanceCents   = parseInt(String(balanceBody['balance'] ?? '0'), 10)
  const thresholdCents = parseInt(process.env.META_BILLING_THRESHOLD_CENTS ?? '0', 10)
  const fondosCents    = thresholdCents > 0 ? Math.max(0, thresholdCents - balanceCents) : 0

  // Consulta de campañas activas/pausadas
  const campUrl = new URL(`${base}/${account}/campaigns`)
  campUrl.searchParams.set('fields', 'name,status,effective_status')
  campUrl.searchParams.set('limit', '50')
  campUrl.searchParams.set('appsecret_proof', ap)
  campUrl.searchParams.set('access_token', token)

  const campRes  = await fetch(campUrl.toString())
  const campBody = await campRes.json() as Record<string, unknown>
  assertNoError(campBody)

  const campaigns = ((campBody['data'] ?? []) as Array<{
    id: string; name: string; status: string; effective_status: string
  }>).map(c => ({
    id:              c.id,
    name:            c.name,
    status:          c.status,
    effectiveStatus: c.effective_status,
  }))

  return {
    fondosDisponibles: fondosCents / 100,
    currency,
    campaigns,
  }
}
