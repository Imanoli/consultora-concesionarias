import type { FastifyInstance } from 'fastify'
import prisma from '../db/prisma.js'
import { syncMetaForClient } from '../jobs/syncMeta.js'
import { MetaApiError } from '../services/metaApi.js'
import { checkAlerts } from '../jobs/checkAlerts.js'
import { runDailyAnalysis } from '../jobs/dailyAnalysis.js'
import { syncGoogleAdsForClient } from '../jobs/syncGoogleAds.js'
import { GoogleAdsApiError } from '../services/googleAdsApi.js'
import { syncClarityForClient } from '../jobs/syncClarity.js'
import { ClarityApiError } from '../services/clarityApi.js'
import { syncGa4ForClient } from '../jobs/syncGa4.js'
import { Ga4ApiError } from '../services/ga4Api.js'

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

  // Análisis diario manual (con fecha opcional)
  app.post('/api/analysis/run', async (request, reply) => {
    const body = request.body as { clientId?: unknown; date?: unknown }
    if (!body.clientId || typeof body.clientId !== 'string') {
      return reply.status(400).send({ error: 'clientId es requerido' })
    }
    const logs: string[] = []
    try {
      await runDailyAnalysis(
        body.clientId,
        typeof body.date === 'string' ? body.date : undefined,
        msg => { logs.push(msg); app.log.info(msg) },
      )
      return reply.send({ ok: true, logs })
    } catch (err) {
      app.log.error(err, '[analysis] error')
      return reply.status(500).send({ error: String(err), logs })
    }
  })

  app.post('/api/sync/google-ads', async (request, reply) => {
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
      const result = await syncGoogleAdsForClient(body.clientId, body.date as string | undefined)
      return result
    } catch (err) {
      if (err instanceof GoogleAdsApiError) {
        app.log.error({ code: err.code }, `[Google Ads] ${err.message}`)
        return reply.status(502).send({ error: err.message })
      }
      app.log.error(err, '[syncGoogleAds] error inesperado')
      return reply.status(500).send({ error: 'Error interno del servidor' })
    }
  })

  app.post('/api/sync/clarity', async (request, reply) => {
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
      const result = await syncClarityForClient(body.clientId, body.date as string | undefined)
      return result
    } catch (err) {
      if (err instanceof ClarityApiError) {
        app.log.error({ status: err.status }, `[Clarity] ${err.message}`)
        return reply.status(502).send({ error: err.message })
      }
      app.log.error(err, '[syncClarity] error inesperado')
      return reply.status(500).send({ error: 'Error interno del servidor' })
    }
  })

  app.post('/api/sync/ga4', async (request, reply) => {
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
      const result = await syncGa4ForClient(body.clientId, body.date as string | undefined)
      return result
    } catch (err) {
      if (err instanceof Ga4ApiError) {
        app.log.error(`[GA4] ${err.message}`)
        return reply.status(502).send({ error: err.message })
      }
      app.log.error(err, '[syncGa4] error inesperado')
      return reply.status(500).send({ error: 'Error interno del servidor' })
    }
  })

  // Backfill de objetivos de campaña para registros históricos
  app.post('/api/sync/meta/backfill-objectives', async (request, reply) => {
    const body = request.body as { clientId?: unknown }
    if (!body.clientId || typeof body.clientId !== 'string') {
      return reply.status(400).send({ error: 'clientId es requerido' })
    }
    const client = await prisma.client.findUnique({ where: { id: body.clientId } })
    if (!client?.metaAdAccountId) {
      return reply.status(404).send({ error: 'Cliente no encontrado o sin cuenta Meta' })
    }
    try {
      const { fetchCampaignObjectives } = await import('../services/metaApi.js')
      const objectivesMap = await fetchCampaignObjectives(client.metaAdAccountId, body.clientId)
      let updated = 0
      for (const [campaignId, objective] of objectivesMap) {
        const result = await prisma.campaignMetricDaily.updateMany({
          where:  { clientId: body.clientId, campaignId },
          data:   { objective },
        })
        updated += result.count
      }
      return { ok: true, campaignsFound: objectivesMap.size, rowsUpdated: updated }
    } catch (err) {
      app.log.error(err, '[backfill-objectives] error')
      return reply.status(500).send({ error: String(err) })
    }
  })

  // Endpoint para probar alertas manualmente
  app.post('/api/alerts/test', async (_request, reply) => {
    const logs: string[] = []
    try {
      const clients = await prisma.client.findMany({
        where: { active: true, metaAdAccountId: { not: null } },
      })
      for (const client of clients) {
        await checkAlerts(
          client.id,
          client.name,
          client.metaAdAccountId     ?? undefined,
          client.googleAdsCustomerId ?? undefined,
          msg => { logs.push(msg); app.log.info(msg) },
        )
      }
      return reply.send({ ok: true, logs })
    } catch (err) {
      app.log.error(err, '[checkAlerts] error inesperado')
      return reply.status(500).send({ error: 'Error interno del servidor', logs })
    }
  })
}
