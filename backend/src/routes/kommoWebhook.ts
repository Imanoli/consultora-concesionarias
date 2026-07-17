import type { FastifyInstance } from 'fastify'
import qs from 'qs'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { processKommoLeadEvent, type KommoStatusChange } from '../jobs/processKommoLeadEvent.js'

const toStringId = z.union([z.string(), z.number()]).transform(String)

const statusChangeSchema = z.object({
  id: toStringId,
  status_id: toStringId,
  old_status_id: toStringId.optional(),
  pipeline_id: toStringId.optional(),
  last_modified: toStringId.optional(),
}).passthrough()

const webhookBodySchema = z.object({
  leads: z.object({
    // "status": nombre de clave de versiones viejas de la API. "update": lo que
    // realmente manda el evento "Lead editado" (incluye status_id cuando cambió de etapa).
    status: z.array(statusChangeSchema).optional(),
    update: z.array(statusChangeSchema).optional(),
  }).optional(),
}).passthrough()

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function kommoWebhookRoutes(app: FastifyInstance) {
  // Kommo manda sus webhooks como application/x-www-form-urlencoded con
  // notación de corchetes (leads[status][0][id]=...), no como JSON plano.
  // Parser acotado a este plugin — no afecta el resto de las rutas.
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, qs.parse(body as string))
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  app.post('/api/webhooks/kommo/:clientId/:secret', async (request, reply) => {
    const { clientId, secret } = request.params as { clientId: string; secret: string }

    const expected = process.env[`KOMMO_WEBHOOK_SECRET_${clientId.toUpperCase()}`]
    if (!expected || !secretMatches(secret, expected)) {
      app.log.warn(`[kommo] Webhook con secreto inválido para clientId='${clientId}'`)
      return reply.status(404).send()
    }

    app.log.info(
      { contentType: request.headers['content-type'], rawBody: request.body },
      '[kommo] Webhook recibido',
    )

    const parsed = webhookBodySchema.safeParse(request.body)
    if (!parsed.success) {
      app.log.error({ issues: parsed.error.issues, rawBody: request.body }, '[kommo] Body de webhook con forma inesperada')
      return reply.status(400).send({ error: 'Formato de webhook no reconocido' })
    }

    const changes = [...(parsed.data.leads?.status ?? []), ...(parsed.data.leads?.update ?? [])]
    let processed = 0
    let skipped = 0

    for (const change of changes) {
      try {
        const result = await processKommoLeadEvent(clientId, change as KommoStatusChange, msg => app.log.info(msg))
        if (result === 'sent') processed++
        else skipped++
      } catch (err) {
        app.log.error(err, `[kommo] Error inesperado procesando lead ${change.id}`)
        skipped++
      }
    }

    return reply.send({ ok: true, processed, skipped })
  })
}
