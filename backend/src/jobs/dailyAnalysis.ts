import prisma from '../db/prisma.js'
import {
  analyzeWithClaude,
  type DaySnapshot,
  type GadsSnapshot,
  type Ga4Snapshot,
  type ClarityWebSnapshot,
} from '../services/claudeAnalysis.js'
import { sendAlert } from '../services/email.js'
import { yesterdayArgentina } from '../utils/dates.js'

function toSnapshot(rows: {
  spend: unknown; impressions: number; reach: number; leads: number
  linkClicks: number; ctr: unknown; cpl: unknown; cpm: unknown; cpc: unknown
  frequency: unknown; purchases: number; instagramFollows: number
}[], days: number, date?: string): DaySnapshot {
  const n = rows.length || 1
  const sum = (f: keyof typeof rows[0]) =>
    rows.reduce((s, r) => s + Number(r[f] ?? 0), 0)

  return {
    date:             date ?? '',
    spend:            sum('spend') / n,
    impressions:      sum('impressions') / n,
    reach:            sum('reach') / n,
    leads:            sum('leads') / n,
    linkClicks:       sum('linkClicks') / n,
    purchases:        sum('purchases') / n,
    instagramFollows: sum('instagramFollows') / n,
    ctr:              rows[0] ? (rows.reduce((s, r) => s + Number(r.ctr ?? 0), 0) / n) : null,
    cpl:              rows[0] ? (rows.reduce((s, r) => s + Number(r.cpl ?? 0), 0) / n || null) : null,
    cpm:              rows[0] ? (rows.reduce((s, r) => s + Number(r.cpm ?? 0), 0) / n || null) : null,
    cpc:              rows[0] ? (rows.reduce((s, r) => s + Number(r.cpc ?? 0), 0) / n || null) : null,
    frequency:        rows[0] ? (rows.reduce((s, r) => s + Number(r.frequency ?? 0), 0) / n || null) : null,
  }
}

function toGads(rows: { spend: unknown; impressions: number; clicks: number; leads: number; ctr: unknown; cpc: unknown }[]): GadsSnapshot | undefined {
  if (rows.length === 0) return undefined
  const n = rows.length
  return {
    spend:       rows.reduce((s, r) => s + Number(r.spend ?? 0), 0) / n,
    impressions: rows.reduce((s, r) => s + (r.impressions ?? 0), 0) / n,
    clicks:      rows.reduce((s, r) => s + (r.clicks ?? 0), 0) / n,
    conversions: rows.reduce((s, r) => s + (r.leads ?? 0), 0) / n,
    ctr:         rows.reduce((s, r) => s + Number(r.ctr ?? 0), 0) / n || null,
    cpc:         rows.reduce((s, r) => s + Number(r.cpc ?? 0), 0) / n || null,
  }
}

function toGa4(rows: { sessions: number; impressions: number; clicks: number; conversions: number }[]): Ga4Snapshot | undefined {
  if (rows.length === 0) return undefined
  const n = rows.length
  return {
    sessions:        rows.reduce((s, r) => s + r.sessions, 0) / n,
    pageViews:       rows.reduce((s, r) => s + r.impressions, 0) / n,
    users:           rows.reduce((s, r) => s + r.clicks, 0) / n,
    engagedSessions: rows.reduce((s, r) => s + r.conversions, 0) / n,
  }
}

function toClarity(rows: { sessions: number; impressions: number; rawData: unknown }[]): ClarityWebSnapshot | undefined {
  if (rows.length === 0) return undefined
  const latest = rows[0]
  const raw    = latest.rawData as Array<{ metricName: string; information: Record<string, unknown>[] }> | null

  const get = (name: string) => raw?.find(m => m.metricName === name)?.information ?? []
  const scroll  = (get('ScrollDepth')[0] as { averageScrollDepth?: number })?.averageScrollDepth ?? 0
  const rage    = (get('RageClickCount')[0] as { subTotal?: unknown })
  const dead    = (get('DeadClickCount')[0] as { subTotal?: unknown })
  const devices = get('Device') as Array<{ name: string; sessionsCount: string }>
  const mobile  = Number(devices.find(d => d.name === 'Mobile')?.sessionsCount ?? 0)
  const pc      = Number(devices.find(d => d.name === 'PC')?.sessionsCount ?? 0)
  const total   = mobile + pc || 1

  return {
    sessions:       latest.sessions,
    pageViews:      latest.impressions,
    avgScrollDepth: Math.round(scroll),
    rageClicks:     Number(rage?.subTotal ?? 0),
    deadClicks:     Number(dead?.subTotal ?? 0),
    mobilePercent:  Math.round((mobile / total) * 100),
  }
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  warning:  '#d97706',
  info:     '#2563eb',
}
const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico',
  warning:  'Alerta',
  info:     'Info',
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 }

function buildEmailHtml(clientName: string, date: string, insights: Awaited<ReturnType<typeof analyzeWithClaude>>['insights'], balanceWarnings: string[] = []): string {
  const sorted = [...insights].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  )

  const rows = sorted.map(ins => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;width:90px">
        <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#fff;background:${SEVERITY_COLOR[ins.severity] ?? '#6b7280'}">
          ${SEVERITY_LABEL[ins.severity] ?? ins.severity}
        </span>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top">
        <div style="font-weight:600;color:#111827;margin-bottom:4px">${ins.title}</div>
        <div style="color:#4b5563;font-size:14px;line-height:1.5">${ins.body}</div>
      </td>
    </tr>`).join('')

  const logoUrl    = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/logos/esac.png`
  const dashUrl    = process.env.FRONTEND_URL ?? 'http://localhost:3000'

  const balanceAlerts = balanceWarnings.map(w => `
    <div style="margin:0 32px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 4px 4px 0;font-size:13px;color:#991b1b">
      <strong>🔴 ${w}</strong>
    </div>`).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#111827;padding:24px 32px">
      <img src="${logoUrl}" alt="${clientName}" style="height:44px;width:auto;display:block;margin-bottom:16px;background:#fff;border-radius:4px;padding:6px 10px" />
      <div style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Resumen diario IA</div>
      <div style="color:#6b7280;font-size:14px;margin-top:4px">${date}</div>
    </div>
    ${balanceAlerts}
    <table style="width:100%;border-collapse:collapse">
      <tbody>${rows}</tbody>
    </table>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <a href="${dashUrl}" style="color:#6b7280;font-size:12px;text-decoration:none">
        Ver dashboard completo →
      </a>
    </div>
  </div>
</body>
</html>`
}

export async function runDailyAnalysis(
  clientId: string,
  date?: string,
  log: (msg: string) => void = console.log,
): Promise<void> {
  const targetDate = date ?? yesterdayArgentina()
  const dateObj    = new Date(targetDate + 'T00:00:00.000Z')

  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } })

  const select = {
    spend: true, impressions: true, reach: true, leads: true,
    linkClicks: true, purchases: true, instagramFollows: true,
    ctr: true, cpl: true, cpm: true, cpc: true, frequency: true,
  }

  const yesterdayRows = await prisma.dailyMetric.findMany({
    where: { clientId, source: 'meta', date: dateObj },
    select,
  })

  if (yesterdayRows.length === 0) {
    log(`[analysis] Sin datos Meta para ${targetDate} — omitiendo`)
    return
  }

  const d7from  = new Date(dateObj); d7from.setUTCDate(d7from.getUTCDate() - 7)
  const d30from = new Date(dateObj); d30from.setUTCDate(d30from.getUTCDate() - 30)

  const last7Rows  = await prisma.dailyMetric.findMany({ where: { clientId, source: 'meta', date: { gte: d7from,  lt: dateObj } }, select })
  const last30Rows = await prisma.dailyMetric.findMany({ where: { clientId, source: 'meta', date: { gte: d30from, lt: dateObj } }, select })

  const yesterday = toSnapshot(yesterdayRows, 1, targetDate)
  const last7     = toSnapshot(last7Rows,     7)
  const last30    = toSnapshot(last30Rows,    30)

  // Google Ads
  const gadsSelect = { spend: true, impressions: true, clicks: true, leads: true, ctr: true, cpc: true }
  const [gadsYestRows, gads7Rows, gads30Rows] = await Promise.all([
    prisma.dailyMetric.findMany({ where: { clientId, source: 'google_ads', date: dateObj },                               select: gadsSelect }),
    prisma.dailyMetric.findMany({ where: { clientId, source: 'google_ads', date: { gte: d7from,  lt: dateObj } },        select: gadsSelect }),
    prisma.dailyMetric.findMany({ where: { clientId, source: 'google_ads', date: { gte: d30from, lt: dateObj } },        select: gadsSelect }),
  ])

  // GA4
  const ga4Select = { sessions: true, impressions: true, clicks: true, conversions: true }
  const [ga4YestRows, ga47Rows] = await Promise.all([
    prisma.dailyMetric.findMany({ where: { clientId, source: 'ga4', date: dateObj },                              select: ga4Select }),
    prisma.dailyMetric.findMany({ where: { clientId, source: 'ga4', date: { gte: d7from, lt: dateObj } },        select: ga4Select }),
  ])

  // Clarity (último día disponible)
  const clarityRows = await prisma.dailyMetric.findMany({
    where:   { clientId, source: 'clarity' },
    orderBy: { date: 'desc' },
    take:    1,
    select:  { sessions: true, impressions: true, rawData: true },
  })

  log(`[analysis] Llamando a Claude para ${client.name} (${targetDate})`)

  const { insights, rawPrompt, rawResponse } = await analyzeWithClaude(
    client.name,
    yesterday, last7, last30,
    toGads(gadsYestRows), toGads(gads7Rows), toGads(gads30Rows),
    toGa4(ga4YestRows), toGa4(ga47Rows),
    toClarity(clarityRows),
  )

  if (insights.length === 0) {
    log(`[analysis] Claude no devolvió insights válidos`)
    return
  }

  await prisma.aiInsight.deleteMany({ where: { clientId, date: dateObj } })
  await prisma.aiInsight.createMany({
    data: insights.map((ins, i) => ({
      clientId,
      date:        dateObj,
      type:        ins.type,
      severity:    ins.severity,
      title:       ins.title,
      body:        ins.body,
      rawPrompt:   i === 0 ? rawPrompt   : null,
      rawResponse: i === 0 ? rawResponse : null,
    })),
  })

  log(`[analysis] ${insights.length} insights guardados para ${client.name} (${targetDate})`)

  // Envío por email
  try {
    const subject = `Resumen diario - ${client.name}`

    // Alertas de saldo rojo para incluir en el email
    // Solo se incluyen si la plataforma tiene campañas activas: sin esto, un cliente
    // con campañas pausadas a propósito (o sin cargar nunca fondos) recibe alertas falsas.
    const freshClient = await prisma.client.findUnique({
      where:  { id: clientId },
      select: { metaFondosUsd: true, metaActiveCampaigns: true, googleAdsFondosArs: true, googleAdsActiveCampaigns: true },
    })
    const balanceWarnings: string[] = []
    const metaUsd    = Number(freshClient?.metaFondosUsd  ?? 999)
    const gadsArs     = Number(freshClient?.googleAdsFondosArs ?? 999_999)
    const metaActive  = freshClient?.metaActiveCampaigns      ?? 0
    const gadsActive   = freshClient?.googleAdsActiveCampaigns ?? 0
    if (metaUsd  < 40     && metaActive > 0) balanceWarnings.push(`Meta Ads — Fondos críticos: USD ${metaUsd.toFixed(2)}. Recargá antes de que se pausan las campañas.`)
    if (gadsArs  < 50_000 && gadsActive > 0) balanceWarnings.push(`Google Ads — Fondos críticos: ARS ${gadsArs.toLocaleString('es-AR')}. Recargá antes de que se pausan las campañas.`)

    await sendAlert(subject, buildEmailHtml(client.name, targetDate, insights, balanceWarnings))
    log(`[analysis] Email enviado a ${process.env.EMAIL_TO}`)
  } catch (err) {
    log(`[analysis] Error enviando email: ${(err as Error).message}`)
  }
}
