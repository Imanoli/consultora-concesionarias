import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../db/prisma.js'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const querySchema = z.object({
  clientId: z.string().min(1),
  source:   z.string().default('meta'),
  from:     z.string().regex(DATE_REGEX, 'formato YYYY-MM-DD'),
  to:       z.string().regex(DATE_REGEX, 'formato YYYY-MM-DD'),
})

type KpiSums = { spend: number; impressions: number; clicks: number; leads: number }

function computeKpis(s: KpiSums) {
  return {
    spend:       s.spend,
    leads:       s.leads,
    impressions: s.impressions,
    clicks:      s.clicks,
    ctr: s.impressions > 0 ? s.clicks / s.impressions : null,
    cpm: s.impressions > 0 ? (s.spend / s.impressions) * 1000 : null,
    cpl: s.leads > 0 ? s.spend / s.leads : null,
  }
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (!previous || current === null) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function toDateObj(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z')
}

function previousPeriod(from: string, to: string): { from: string; to: string } {
  const fromDate = toDateObj(from)
  const toDate   = toDateObj(to)
  const duration = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1

  const prevTo   = new Date(fromDate)
  prevTo.setUTCDate(prevTo.getUTCDate() - 1)

  const prevFrom = new Date(fromDate)
  prevFrom.setUTCDate(prevFrom.getUTCDate() - duration)

  return {
    from: prevFrom.toISOString().split('T')[0],
    to:   prevTo.toISOString().split('T')[0],
  }
}

async function aggregatePeriod(clientId: string, source: string, from: string, to: string): Promise<KpiSums> {
  const result = await prisma.dailyMetric.aggregate({
    where: { clientId, source, date: { gte: toDateObj(from), lte: toDateObj(to) } },
    _sum:  { spend: true, impressions: true, clicks: true, leads: true },
  })
  return {
    spend:       Number(result._sum.spend       ?? 0),
    impressions: result._sum.impressions ?? 0,
    clicks:      result._sum.clicks      ?? 0,
    leads:       result._sum.leads       ?? 0,
  }
}

export async function metricsRoutes(app: FastifyInstance) {

  // KPIs agregados del período + comparación con período anterior de igual duración
  app.get('/api/metrics', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: parsed.error.issues })
    }
    const { clientId, source, from, to } = parsed.data

    const prev = previousPeriod(from, to)
    const [curSums, prevSums] = await Promise.all([
      aggregatePeriod(clientId, source, from, to),
      aggregatePeriod(clientId, source, prev.from, prev.to),
    ])

    const current  = computeKpis(curSums)
    const previous = computeKpis(prevSums)

    return {
      period: { from, to },
      current,
      previous,
      change: {
        spend:       pctChange(current.spend,       previous.spend),
        leads:       pctChange(current.leads,       previous.leads),
        impressions: pctChange(current.impressions, previous.impressions),
        clicks:      pctChange(current.clicks,      previous.clicks),
        ctr:         pctChange(current.ctr,         previous.ctr),
        cpm:         pctChange(current.cpm,         previous.cpm),
        cpl:         pctChange(current.cpl,         previous.cpl),
      },
    }
  })

  // Serie temporal diaria para gráficos (días sin datos no se incluyen)
  app.get('/api/metrics/daily', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: parsed.error.issues })
    }
    const { clientId, source, from, to } = parsed.data

    const rows = await prisma.dailyMetric.findMany({
      where:   { clientId, source, date: { gte: toDateObj(from), lte: toDateObj(to) } },
      orderBy: { date: 'asc' },
      select:  { date: true, spend: true, impressions: true, clicks: true, leads: true, ctr: true, cpm: true, cpl: true },
    })

    return {
      period: { from, to },
      data: rows.map(r => ({
        date:        r.date.toISOString().split('T')[0],
        spend:       Number(r.spend),
        impressions: r.impressions,
        clicks:      r.clicks,
        leads:       r.leads,
        ctr:         r.ctr  ? Number(r.ctr)  : null,
        cpm:         r.cpm  ? Number(r.cpm)  : null,
        cpl:         r.cpl  ? Number(r.cpl)  : null,
      })),
    }
  })

  // Desglose por campaña en el rango, ordenado por spend descendente
  app.get('/api/campaigns', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: parsed.error.issues })
    }
    const { clientId, source, from, to } = parsed.data

    const rows = await prisma.campaignMetricDaily.groupBy({
      by:      ['campaignId', 'campaignName'],
      where:   { clientId, source, date: { gte: toDateObj(from), lte: toDateObj(to) } },
      _sum:    { spend: true, impressions: true, clicks: true, leads: true },
      orderBy: { _sum: { spend: 'desc' } },
    })

    return {
      period: { from, to },
      data: rows.map(r => {
        const spend       = Number(r._sum.spend       ?? 0)
        const impressions = r._sum.impressions ?? 0
        const clicks      = r._sum.clicks      ?? 0
        const leads       = r._sum.leads       ?? 0
        return {
          campaignId:   r.campaignId,
          campaignName: r.campaignName,
          spend,
          impressions,
          clicks,
          leads,
          ctr: impressions > 0 ? clicks / impressions : null,
          cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
          cpl: leads > 0 ? spend / leads : null,
        }
      }),
    }
  })
}
