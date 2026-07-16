export interface KommoContact {
  email: string | null
  phone: string | null
}

export class KommoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'KommoApiError'
  }
}

interface KommoEnv {
  subdomain: string
  token: string
}

function requireKommoEnv(clientId: string): KommoEnv {
  const suffix = clientId.toUpperCase()
  const subdomain = process.env[`KOMMO_SUBDOMAIN_${suffix}`]
  const token = process.env[`KOMMO_API_TOKEN_${suffix}`]
  if (!subdomain || !token) {
    throw new Error(`Faltan variables: KOMMO_SUBDOMAIN_${suffix} o KOMMO_API_TOKEN_${suffix}`)
  }
  return { subdomain, token }
}

interface KommoCustomField {
  field_code?: string
  values?: { value?: string }[]
}

interface KommoContactResponse {
  custom_fields_values?: KommoCustomField[] | null
}

interface KommoLeadResponse {
  _embedded?: {
    contacts?: { id: number }[]
  }
}

function extractField(fields: KommoCustomField[] | null | undefined, code: string): string | null {
  const field = fields?.find(f => f.field_code === code)
  return field?.values?.[0]?.value ?? null
}

/**
 * Trae el contacto vinculado a un lead. Kommo no manda email/telefono en el
 * webhook de cambio de estado — hay que pedirlo aparte via la API.
 */
export async function fetchLeadContact(leadId: string, clientId: string): Promise<KommoContact> {
  const { subdomain, token } = requireKommoEnv(clientId)
  const base = `https://${subdomain}.kommo.com/api/v4`
  const headers = { Authorization: `Bearer ${token}` }

  const leadRes = await fetch(`${base}/leads/${leadId}?with=contacts`, { headers })
  if (!leadRes.ok) {
    throw new KommoApiError(`Error al obtener lead ${leadId} (HTTP ${leadRes.status})`, leadRes.status)
  }
  const lead = await leadRes.json() as KommoLeadResponse
  const contactId = lead._embedded?.contacts?.[0]?.id
  if (!contactId) return { email: null, phone: null }

  const contactRes = await fetch(`${base}/contacts/${contactId}`, { headers })
  if (!contactRes.ok) {
    throw new KommoApiError(`Error al obtener contacto ${contactId} (HTTP ${contactRes.status})`, contactRes.status)
  }
  const contact = await contactRes.json() as KommoContactResponse

  return {
    email: extractField(contact.custom_fields_values, 'EMAIL'),
    phone: extractField(contact.custom_fields_values, 'PHONE'),
  }
}
