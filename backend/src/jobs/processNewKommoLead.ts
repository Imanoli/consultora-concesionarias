import { setCreateQuoteLinkField, KommoApiError } from '../services/kommoApi.js'

/**
 * Se dispara cuando Kommo avisa que se creo un lead nuevo. Completa el
 * campo "Crear presupuesto" con el link directo al formulario, precargado
 * con este lead — asi el vendedor lo ve como link clickeable en la tarjeta.
 */
export async function processNewKommoLead(
  clientId: string,
  leadId: string,
  log: (msg: string) => void = console.log,
): Promise<void> {
  try {
    await setCreateQuoteLinkField(leadId, clientId)
    log(`[kommo] Lead ${leadId} — link de "Crear presupuesto" generado`)
  } catch (err) {
    const message = err instanceof KommoApiError ? err.message : String(err)
    log(`[kommo] Error al generar el link de "Crear presupuesto" para el lead ${leadId}: ${message}`)
  }
}
