import { Prisma } from '@prisma/client'
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

  // Reserva atómica: el constraint único (clientId, kommoLeadId, kommoStatusId) actúa
  // como lock. Kommo puede mandar el mismo webhook más de una vez casi al mismo tiempo
  // — si otra llamada concurrente ya reservó este lead+etapa, este create falla con
  // P2002 y salimos ahí, sin volver a tocar Kommo ni Meta. Todo lo que sigue usa
  // `update` sobre este mismo registro, nunca un segundo `create`.
  let record
  try {
    record = await prisma.kommoLeadEvent.create({
      data: {
        clientId,
        kommoLeadId: change.id,
        kommoStatusId: change.status_id,
        kommoOldStatusId: change.old_status_id ?? null,
        kommoPipelineId: change.pipeline_id ?? null,
        eventName,
        matchKey: 'none',
        status: 'pending',
        rawWebhook: change as unknown as object,
      },
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      log(`[kommo] Lead ${change.id} → '${eventName}' ya se está procesando o ya se procesó, se omite`)
      return 'duplicate'
    }
    throw err
  }

  let contact
  try {
    contact = await fetchLeadContact(change.id, clientId)
  } catch (err) {
    const message = err instanceof KommoApiError ? err.message : String(err)
    log(`[kommo] Error al traer contacto del lead ${change.id}: ${message}`)
    await prisma.kommoLeadEvent.update({
      where: { id: record.id },
      data: { status: 'failed', metaErrorMessage: message, attempts: 1 },
    })
    return 'failed'
  }

  if (!contact.email && !contact.phone) {
    log(`[kommo] Lead ${change.id} no tiene email ni teléfono — no se puede identificar ante Meta`)
    await prisma.kommoLeadEvent.update({
      where: { id: record.id },
      data: { status: 'failed', metaErrorMessage: 'Lead sin email ni teléfono', attempts: 1 },
    })
    return 'failed'
  }

  const matchKey = contact.email && contact.phone ? 'both' : contact.email ? 'email' : 'phone'
  const emailHash = contact.email ? hashAudit(contact.email) : null
  const phoneHash = contact.phone ? hashAudit(contact.phone) : null
  const eventTime = change.last_modified ? parseInt(change.last_modified, 10) : Math.floor(Date.now() / 1000)
  const eventId = `kommo-${clientId}-${change.id}-${change.status_id}`

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
    await prisma.kommoLeadEvent.update({
      where: { id: record.id },
      data: {
        matchKey,
        emailHash,
        phoneHash,
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
    await prisma.kommoLeadEvent.update({
      where: { id: record.id },
      data: { matchKey, emailHash, phoneHash, status: 'failed', metaErrorMessage: message, attempts: 1 },
    })
    return 'failed'
  }
}
