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

interface PeriodSums {
  spend:            number
  impressions:      number
  clicks:           number
  leads:            number
  reach:            number
  linkClicks:       number
  purchases:        number
  instagramFollows: number
  sessions:         number
  conversions:      number
}

function computeKpis(s: PeriodSums) {
  const ctrVal = s.impressions > 0 ? s.linkClicks / s.impressions : null
  return {
    spend:            s.spend,
    leads:            s.leads,
    impressions:      s.impressions,
    clicks:           s.clicks,
    reach:            s.reach,
    linkClicks:       s.linkClicks,
    purchases:        s.purchases,
    instagramFollows: s.instagramFollows,
    sessions:         s.sessions,
    conversions:      s.conversions,
    frequency:        s.reach > 0 ? s.impressions / s.reach : null,
    ctr:              ctrVal,
    cpm:              s.impressions > 0 ? (s.spend / s.impressions) * 1000 : null,
    cpl:              s.leads > 0 ? s.spend / s.leads : null,
    cpc:              s.linkClicks > 0 ? s.spend / s.linkClicks : null,
    cpr:              s.leads > 0 ? s.spend / s.leads : null,
    costPerFollower:  s.instagramFollows > 0 ? s.spend / s.instagramFollows : null,
    costPerPurchase:  s.purchases > 0 ? s.spend / s.purchases : null,
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

async function aggregatePeriod(clientId: string, source: string, from: string, to: string): Promise<PeriodSums> {
  const result = await prisma.dailyMetric.aggregate({
    where: { clientId, source, date: { gte: toDateObj(from), lte: toDateObj(to) } },
    _sum:  {
      spend: true, impressions: true, clicks: true, leads: true,
      reach: true, linkClicks: true, purchases: true, instagramFollows: true,
      sessions: true, conversions: true,
    },
  })
  return {
    spend:            Number(result._sum.spend            ?? 0),
    impressions:      result._sum.impressions      ?? 0,
    clicks:           result._sum.clicks           ?? 0,
    leads:            result._sum.leads            ?? 0,
    reach:            result._sum.reach            ?? 0,
    linkClicks:       result._sum.linkClicks       ?? 0,
    purchases:        result._sum.purchases        ?? 0,
    instagramFollows: result._sum.instagramFollows ?? 0,
    sessions:         result._sum.sessions         ?? 0,
    conversions:      result._sum.conversions      ?? 0,
  }
}

export async function metricsRoutes(app: FastifyInstance) {

  app.get('/api/insights', async (request, reply) => {
    const { clientId, date } = request.query as { clientId?: string; date?: string }
    if (!clientId) return reply.status(400).send({ error: 'clientId requerido' })

    const where = date
      ? { clientId, date: new Date(date + 'T00:00:00.000Z') }
      : { clientId }

    const rows = await prisma.aiInsight.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
      select: { id: true, date: true, type: true, severity: true, title: true, body: true },
      take: 20,
    })

    return rows.map(r => ({
      id:       r.id,
      date:     r.date.toISOString().split('T')[0],
      type:     r.type,
      severity: r.severity,
      title:    r.title,
      body:     r.body,
    }))
  })

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
        spend:            pctChange(current.spend,            previous.spend),
        leads:            pctChange(current.leads,            previous.leads),
        impressions:      pctChange(current.impressions,      previous.impressions),
        clicks:           pctChange(current.clicks,           previous.clicks),
        reach:            pctChange(current.reach,            previous.reach),
        linkClicks:       pctChange(current.linkClicks,       previous.linkClicks),
        purchases:        pctChange(current.purchases,        previous.purchases),
        instagramFollows: pctChange(current.instagramFollows, previous.instagramFollows),
        sessions:         pctChange(current.sessions,         previous.sessions),
        conversions:      pctChange(current.conversions,      previous.conversions),
        ctr:              pctChange(current.ctr,              previous.ctr),
        cpm:              pctChange(current.cpm,              previous.cpm),
        cpl:              pctChange(current.cpl,              previous.cpl),
        cpc:              pctChange(current.cpc,              previous.cpc),
      },
    }
  })

  app.get('/api/metrics/daily', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: parsed.error.issues })
    }
    const { clientId, source, from, to } = parsed.data

    const rows = await prisma.dailyMetric.findMany({
      where:   { clientId, source, date: { gte: toDateObj(from), lte: toDateObj(to) } },
      orderBy: { date: 'asc' },
      select:  {
        date: true, spend: true, impressions: true, clicks: true, leads: true,
        reach: true, linkClicks: true, purchases: true, instagramFollows: true,
        frequency: true, ctr: true, cpm: true, cpl: true, cpc: true,
      },
    })

    return {
      period: { from, to },
      data: rows.map(r => ({
        date:             r.date.toISOString().split('T')[0],
        spend:            Number(r.spend),
        impressions:      r.impressions,
        clicks:           r.clicks,
        leads:            r.leads,
        reach:            r.reach,
        linkClicks:       r.linkClicks,
        purchases:        r.purchases,
        instagramFollows: r.instagramFollows,
        frequency:        r.frequency  ? Number(r.frequency)  : null,
        ctr:              r.ctr        ? Number(r.ctr)        : null,
        cpm:              r.cpm        ? Number(r.cpm)        : null,
        cpl:              r.cpl        ? Number(r.cpl)        : null,
        cpc:              r.cpc        ? Number(r.cpc)        : null,
      })),
    }
  })

  // Datos ricos de Clarity (scroll, rage clicks, dispositivos, etc.)
  app.get('/api/clarity', async (request, reply) => {
    const { clientId, from, to } = request.query as { clientId?: string; from?: string; to?: string }
    if (!clientId) return reply.status(400).send({ error: 'clientId requerido' })

    const where = {
      clientId,
      source: 'clarity',
      ...(from && to ? { date: { gte: toDateObj(from), lte: toDateObj(to) } } : {}),
    }

    const rows = await prisma.dailyMetric.findMany({
      where,
      orderBy: { date: 'desc' },
      select:  { date: true, sessions: true, impressions: true, clicks: true, rawData: true },
      take: 30,
    })

    if (rows.length === 0) return { data: [] }

    // Para el rango, devuelve el agregado + rawData del día más reciente (para métricas que no suman)
    const latest = rows[0]
    const raw    = latest.rawData as Array<{ metricName: string; information: Record<string, unknown>[] }> | null

    function getRaw(name: string) {
      return raw?.find(m => m.metricName === name)?.information ?? []
    }

    const scroll  = (getRaw('ScrollDepth')[0] as { averageScrollDepth?: number })?.averageScrollDepth ?? 0
    const time    = getRaw('EngagementTime')[0] as Record<string, unknown> | undefined
    const rage    = (getRaw('RageClickCount')[0] as Record<string, unknown> | undefined)
    const dead    = (getRaw('DeadClickCount')[0] as Record<string, unknown> | undefined)
    const devices = getRaw('Device') as Array<{ name: string; sessionsCount: string }>
    const countries = getRaw('Country') as Array<{ name: string; sessionsCount: string }>
    const pages   = getRaw('PopularPages') as Array<{ url: string; visitsCount: number }>

    const mobileCount = Number(devices.find(d => d.name === 'Mobile')?.sessionsCount ?? 0)
    const pcCount     = Number(devices.find(d => d.name === 'PC')?.sessionsCount ?? 0)
    const deviceTotal = mobileCount + pcCount || 1

    return {
      period: { from: rows[rows.length - 1].date.toISOString().split('T')[0], to: latest.date.toISOString().split('T')[0] },
      summary: {
        totalSessions:   rows.reduce((s, r) => s + r.sessions, 0),
        totalPageViews:  rows.reduce((s, r) => s + r.impressions, 0),
        distinctUsers:   rows.reduce((s, r) => s + r.clicks, 0),
        avgScrollDepth:  Math.round(scroll),
        totalTimeSec:    Number(time?.totalTime ?? 0),
        activeTimeSec:   Number(time?.activeTime ?? 0),
        rageClicks:      Number(rage?.subTotal ?? 0),
        deadClicks:      Number(dead?.subTotal ?? 0),
        mobilePercent:   Math.round((mobileCount / deviceTotal) * 100),
      },
      devices:   devices.map(d => ({ name: d.name, sessions: Number(d.sessionsCount) })),
      countries: countries.slice(0, 5).map(c => ({ name: c.name, sessions: Number(c.sessionsCount) })),
      pages:     pages.slice(0, 5).map(p => ({ url: p.url, visitsCount: Number(p.visitsCount) })),
      data:      rows.map(r => ({
        date:      r.date.toISOString().split('T')[0],
        sessions:  r.sessions,
        pageViews: r.impressions,
      })),
    }
  })

  app.get('/api/campaigns', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: parsed.error.issues })
    }
    const { clientId, source, from, to } = parsed.data

    const rows = await prisma.campaignMetricDaily.groupBy({
      by:      ['campaignId', 'campaignName'],
      where:   { clientId, source, date: { gte: toDateObj(from), lte: toDateObj(to) } },
      _sum:    {
        spend: true, impressions: true, clicks: true, leads: true,
        reach: true, linkClicks: true, purchases: true, instagramFollows: true,
      },
      orderBy: { _sum: { spend: 'desc' } },
    })

    return {
      period: { from, to },
      data: rows.map(r => {
        const spend            = Number(r._sum.spend            ?? 0)
        const impressions      = r._sum.impressions      ?? 0
        const clicks           = r._sum.clicks           ?? 0
        const leads            = r._sum.leads            ?? 0
        const reach            = r._sum.reach            ?? 0
        const linkClicks       = r._sum.linkClicks       ?? 0
        const purchases        = r._sum.purchases        ?? 0
        const instagramFollows = r._sum.instagramFollows ?? 0
        return {
          campaignId:       r.campaignId,
          campaignName:     r.campaignName,
          spend, impressions, clicks, leads, reach, linkClicks, purchases, instagramFollows,
          frequency:        reach > 0 ? impressions / reach : null,
          ctr:              impressions > 0 ? linkClicks / impressions : null,
          cpm:              impressions > 0 ? (spend / impressions) * 1000 : null,
          cpl:              leads > 0 ? spend / leads : null,
          cpc:              linkClicks > 0 ? spend / linkClicks : null,
          costPerFollower:  instagramFollows > 0 ? spend / instagramFollows : null,
          costPerPurchase:  purchases > 0 ? spend / purchases : null,
        }
      }),
    }
  })
}
