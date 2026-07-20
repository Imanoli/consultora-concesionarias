export interface KommoContact {
  name: string | null
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
  name?: string | null
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
  if (!contactId) return { name: null, email: null, phone: null }

  const contactRes = await fetch(`${base}/contacts/${contactId}`, { headers })
  if (!contactRes.ok) {
    throw new KommoApiError(`Error al obtener contacto ${contactId} (HTTP ${contactRes.status})`, contactRes.status)
  }
  const contact = await contactRes.json() as KommoContactResponse

  return {
    name: contact.name ?? null,
    email: extractField(contact.custom_fields_values, 'EMAIL'),
    phone: extractField(contact.custom_fields_values, 'PHONE'),
  }
}

/**
 * Agrega una nota de texto a un lead — se usa para dejar el link del
 * presupuesto vinculado directamente en Kommo.
 */
export async function addLeadNote(leadId: string, text: string, clientId: string): Promise<void> {
  const { subdomain, token } = requireKommoEnv(clientId)
  const base = `https://${subdomain}.kommo.com/api/v4`

  const res = await fetch(`${base}/leads/notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ entity_id: Number(leadId), note_type: 'common', params: { text } }]),
  })
  if (!res.ok) {
    throw new KommoApiError(`Error al agregar nota al lead ${leadId} (HTTP ${res.status})`, res.status)
  }
}

async function updateLeadCustomField(leadId: string, fieldId: number, value: string, clientId: string): Promise<void> {
  const { subdomain, token } = requireKommoEnv(clientId)
  const base = `https://${subdomain}.kommo.com/api/v4`

  const res = await fetch(`${base}/leads/${leadId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      custom_fields_values: [{ field_id: fieldId, values: [{ value }] }],
    }),
  })
  if (!res.ok) {
    throw new KommoApiError(`Error al actualizar campo del lead ${leadId} (HTTP ${res.status})`, res.status)
  }
}

/**
 * Completa el campo personalizado "Link presupuesto" (u otro configurado
 * via KOMMO_QUOTE_FIELD_ID_<CLIENTE>) en el lead, si ese cliente tiene
 * el campo configurado. Si no hay campo configurado, no hace nada.
 */
export async function setQuoteLinkField(leadId: string, url: string, clientId: string): Promise<void> {
  const fieldId = process.env[`KOMMO_QUOTE_FIELD_ID_${clientId.toUpperCase()}`]
  if (!fieldId) return
  await updateLeadCustomField(leadId, Number(fieldId), url, clientId)
}

/**
 * Completa el campo personalizado "Crear presupuesto" (via
 * KOMMO_CREATE_QUOTE_FIELD_ID_<CLIENTE>) con un link directo al
 * formulario de nuevo presupuesto, precargado con este lead. Se llama
 * cuando se crea un lead nuevo — asi el vendedor lo ve como link
 * clickeable en la tarjeta del lead sin tener que buscar el ID a mano.
 */
export async function setCreateQuoteLinkField(leadId: string, clientId: string): Promise<void> {
  const fieldId = process.env[`KOMMO_CREATE_QUOTE_FIELD_ID_${clientId.toUpperCase()}`]
  if (!fieldId) return

  const suffix      = clientId.toUpperCase()
  const frontendUrl = process.env[`FRONTEND_URL_${suffix}`] ?? process.env.FRONTEND_URL ?? 'http://localhost:3000'
  const url         = `${frontendUrl}/dashboard/presupuestos/nuevo?client=${clientId}&leadId=${leadId}`

  await updateLeadCustomField(leadId, Number(fieldId), url, clientId)
}
