import { createHash, createHmac } from 'crypto'

export class MetaCapiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly subcode?: number,
    public readonly fbtraceId?: string,
  ) {
    super(message)
    this.name = 'MetaCapiError'
  }
}

interface MetaCapiEnv {
  pixelId: string
  token: string
  secret: string
  version: string
  testEventCode?: string
}

function requireCapiEnv(clientId: string): MetaCapiEnv {
  const suffix = clientId.toUpperCase()
  const pixelId = process.env[`META_PIXEL_ID_${suffix}`]
  const token = process.env[`META_CAPI_ACCESS_TOKEN_${suffix}`]
  const secret = process.env[`META_CAPI_APP_SECRET_${suffix}`]
  const version = process.env.META_GRAPH_API_VERSION ?? 'v21.0'
  const testEventCode = process.env[`META_CAPI_TEST_EVENT_CODE_${suffix}`] || undefined
  if (!pixelId || !token || !secret) {
    throw new Error(`Faltan variables: META_PIXEL_ID_${suffix}, META_CAPI_ACCESS_TOKEN_${suffix} o META_CAPI_APP_SECRET_${suffix}`)
  }
  return { pixelId, token, secret, version, testEventCode }
}

function computeProof(secret: string, token: string): string {
  return createHmac('sha256', secret).update(token).digest('hex')
}

/** Hash requerido por Meta para email/telefono en user_data: trim + minusculas + SHA-256. */
export function hashForMeta(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/** Deja solo digitos y antepone el codigo de pais si falta (54 = Argentina). */
export function normalizePhoneForMeta(raw: string, defaultCountryCode = '54'): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith(defaultCountryCode)) return digits
  if (digits.startsWith('0')) return `${defaultCountryCode}${digits.slice(1)}`
  return `${defaultCountryCode}${digits}`
}

interface MetaErrorBody {
  message: string
  type: string
  code: number
  error_subcode?: number
  fbtrace_id?: string
}

function assertNoError(body: Record<string, unknown>): void {
  if (!body['error']) return
  const e = body['error'] as MetaErrorBody
  const messages: Record<number, string> = {
    190: 'Token inválido o expirado',
    17: 'Rate limit — reintentar más tarde',
    32: 'Rate limit — reintentar más tarde',
    613: 'Rate limit — reintentar más tarde',
    368: 'Cuenta bloqueada por políticas de Meta',
  }
  throw new MetaCapiError(
    messages[e.code] ?? e.message,
    e.code,
    e.error_subcode,
    e.fbtrace_id,
  )
}

export interface ConversionLeadEvent {
  clientId: string
  eventName: string
  eventTime: number
  eventId: string
  email: string | null
  phone: string | null
}

export interface ConversionLeadResult {
  eventsReceived: number
  fbtraceId?: string
}

/**
 * Manda un evento "Conversion Leads" a Meta: le informa en que etapa del CRM
 * quedo un lead, identificandolo por email/telefono hasheados (no por el
 * lead_id nativo de Meta, que no siempre esta disponible segun el origen del lead).
 */
export async function sendConversionLeadEvent(event: ConversionLeadEvent): Promise<ConversionLeadResult> {
  const { pixelId, token, secret, version, testEventCode } = requireCapiEnv(event.clientId)
  const proof = computeProof(secret, token)

  const userData: Record<string, string[]> = {}
  if (event.email) userData.em = [hashForMeta(event.email)]
  if (event.phone) userData.ph = [hashForMeta(normalizePhoneForMeta(event.phone))]

  const url = new URL(`https://graph.facebook.com/${version}/${pixelId}/events`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('appsecret_proof', proof)

  const body: Record<string, unknown> = {
    data: [{
      event_name: event.eventName,
      event_time: event.eventTime,
      action_source: 'system_generated',
      event_id: event.eventId,
      user_data: userData,
      custom_data: {
        lead_event_source: 'Kommo',
        event_source: 'crm',
      },
    }],
  }
  if (testEventCode) body.test_event_code = testEventCode

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const responseBody = await res.json() as Record<string, unknown>
  assertNoError(responseBody)

  return {
    eventsReceived: Number(responseBody['events_received'] ?? 0),
    fbtraceId: responseBody['fbtrace_id'] as string | undefined,
  }
}
