import type { FastifyInstance } from 'fastify'
import prisma from '../db/prisma.js'
import { syncMetaForClient } from '../jobs/syncMeta.js'
import { MetaApiError } from '../services/metaApi.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function syncRoutes(app: FastifyInstance) {
  app.post('/api/sync/meta', async (request, reply) => {
    const body = request.body as { clientId?: unknown; date?: unknown }

    if (!body.clientId || typeof body.clientId !== 'string') {
      return reply.status(400).send({ error: 'clientId es requerido' })
    }

    if (body.date !== undefined && (typeof body.date !== 'string' || !DATE_RE.test(body.date))) {
      return reply.status(400).send({ error: 'date debe tener formato YYYY-MM-DD' })
    }

    const client = await prisma.client.findUnique({ where: { id: body.clientId } })
    if (!client) {
      return reply.status(404).send({ error: `Cliente '${body.clientId}' no encontrado` })
    }

    try {
      const result = await syncMetaForClient(body.clientId, body.date)
      return result
    } catch (err) {
      if (err instanceof MetaApiError) {
        app.log.error({ code: err.code, subcode: err.subcode }, `[Meta API] ${err.message}`)
        return reply.status(502).send({ error: err.message })
      }
      app.log.error(err, '[syncMeta] error inesperado')
      return reply.status(500).send({ error: 'Error interno del servidor' })
    }
  })
}
