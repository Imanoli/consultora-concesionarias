import prisma from '../db/prisma.js'
import { fetchLeadContact, KommoApiError } from '../services/kommoApi.js'
import { sendConversionLeadEvent, MetaCapiError } from '../services/metaConversions.js'
import { createHash } from 'crypto'

export interface KommoStatusChange {
  id: string
  status_id: string
  old_status_id?: string
  pipeline_id?: string
  last_modified?: string
}

export type ProcessResult = 'sent' | 'skipped' | 'failed' | 'duplicate'

function hashAudit(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export async function processKommoLeadEvent(
  clientId: string,
  change: KommoStatusChange,
  log: (msg: string) => void = console.log,
): Promise<ProcessResult> {
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) {
    log(`[kommo] Cliente '${clientId}' no encontrado`)
    return 'skipped'
  }

  const mapping = (client.kommoStatusMapping as Record<string, string> | null) ?? {}
  const eventName = mapping[change.status_id]
  if (!eventName) {
    // Cambio de etapa que no nos interesa (no es "Auto Facturado" ni "Venta Perdida")
    return 'skipped'
  }

  const existing = await prisma.kommoLeadEvent.findUnique({
    where: {
      clientId_kommoLeadId_kommoStatusId: {
        clientId,
        kommoLeadId: change.id,
        kommoStatusId: change.status_id,
      },
    },
  })
  if (existing) {
    log(`[kommo] Lead ${change.id} → '${eventName}' ya fue enviado antes, se omite`)
    return 'duplicate'
  }

  const eventTime = change.last_modified ? parseInt(change.last_modified, 10) : Math.floor(Date.now() / 1000)
  const eventId = `kommo-${clientId}-${change.id}-${change.status_id}`

  const base = {
    clientId,
    kommoLeadId: change.id,
    kommoStatusId: change.status_id,
    kommoOldStatusId: change.old_status_id ?? null,
    kommoPipelineId: change.pipeline_id ?? null,
    eventName,
    rawWebhook: change as unknown as object,
  }

  let contact
  try {
    contact = await fetchLeadContact(change.id, clientId)
  } catch (err) {
    const message = err instanceof KommoApiError ? err.message : String(err)
    log(`[kommo] Error al traer contacto del lead ${change.id}: ${message}`)
    await prisma.kommoLeadEvent.create({
      data: { ...base, matchKey: 'none', status: 'failed', metaErrorMessage: message, attempts: 1 },
    })
    return 'failed'
  }

  if (!contact.email && !contact.phone) {
    log(`[kommo] Lead ${change.id} no tiene email ni teléfono — no se puede identificar ante Meta`)
    await prisma.kommoLeadEvent.create({
      data: { ...base, matchKey: 'none', status: 'failed', metaErrorMessage: 'Lead sin email ni teléfono', attempts: 1 },
    })
    return 'failed'
  }

  const matchKey = contact.email && contact.phone ? 'both' : contact.email ? 'email' : 'phone'

  try {
    const result = await sendConversionLeadEvent({
      clientId,
      eventName,
      eventTime,
      eventId,
      email: contact.email,
      phone: contact.phone,
    })
    log(`[kommo] Lead ${change.id} → '${eventName}' enviado a Meta (events_received=${result.eventsReceived})`)
    await prisma.kommoLeadEvent.create({
      data: {
        ...base,
        matchKey,
        emailHash: contact.email ? hashAudit(contact.email) : null,
        phoneHash: contact.phone ? hashAudit(contact.phone) : null,
        status: 'sent',
        metaEventId: eventId,
        metaFbtraceId: result.fbtraceId ?? null,
        attempts: 1,
        sentAt: new Date(),
      },
    })
    return 'sent'
  } catch (err) {
    const message = err instanceof MetaCapiError ? err.message : String(err)
    log(`[kommo] Error enviando a Meta el lead ${change.id}: ${message}`)
    await prisma.kommoLeadEvent.create({
      data: {
        ...base,
        matchKey,
        emailHash: contact.email ? hashAudit(contact.email) : null,
        phoneHash: contact.phone ? hashAudit(contact.phone) : null,
        status: 'failed',
        metaErrorMessage: message,
        attempts: 1,
      },
    })
    return 'failed'
  }
}
