import prisma from '../db/prisma.js'
import { fetchCampaignInsights, MetaCampaignInsight, MetaAction } from '../services/metaApi.js'
import { yesterdayArgentina } from '../utils/dates.js'

export interface SyncResult {
  date:               string
  campaignsProcessed: number
  leadsTotal:         number
  spendTotal:         number
}

/**
 * Extrae el conteo de una acción específica sumando los action_types indicados.
 *
 * IMPORTANTE: los action_types deben ser mutuamente excluyentes.
 * Si se incluyen tipos que se solapan (ej. "lead" y "onsite_conversion.lead_grouped",
 * donde el segundo agrupa al primero), se producirá doble conteo.
 */
function extractActions(actions: MetaAction[] | undefined, types: string[]): number {
  if (!types.length || !actions?.length) return 0
  return actions
    .filter(a => types.includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value, 10), 0)
}

function parseNum(val: string | undefined): number {
  const n = parseFloat(val ?? '0')
  return isNaN(n) ? 0 : n
}

export async function syncMetaForClient(clientId: string, date?: string): Promise<SyncResult> {
  const targetDate = date ?? yesterdayArgentina()
  const dateObj    = new Date(targetDate + 'T00:00:00.000Z')

  const client    = await prisma.client.findUniqueOrThrow({ where: { id: clientId } })
  const leadTypes = (client.metaLeadActions as string[] | null) ?? []

  if (!client.metaAdAccountId) {
    return { date: targetDate, campaignsProcessed: 0, leadsTotal: 0, spendTotal: 0 }
  }

  const insights = await fetchCampaignInsights(targetDate, client.metaAdAccountId, clientId)
  if (insights.length === 0) {
    return { date: targetDate, campaignsProcessed: 0, leadsTotal: 0, spendTotal: 0 }
  }

  type CampaignRow = {
    id: string; name: string
    spend: number; impressions: number; clicks: number; leads: number
    reach: number; linkClicks: number; purchases: number; instagramFollows: number
    frequency: number | null
    ctr: number | null; cpm: number | null; cpl: number | null; cpc: number | null
    raw: MetaCampaignInsight
  }

  const campaigns: CampaignRow[] = []

  for (const insight of insights) {
    const spend            = parseNum(insight.spend)
    const impressions      = Math.round(parseNum(insight.impressions))
    const clicks           = Math.round(parseNum(insight.clicks))
    const reach            = Math.round(parseNum(insight.reach))
    const linkClicks       = Math.round(parseNum(insight.inline_link_clicks))
    const frequency        = parseNum(insight.frequency) || null
    const leads            = extractActions(insight.actions, leadTypes)
    const purchases        = extractActions(insight.actions, ['omni_purchase'])
    // instagram_profile_follow es el action_type estándar para seguidores de Instagram desde ads
    const instagramFollows = extractActions(insight.actions, ['instagram_profile_follow'])

    if (isNaN(spend)) {
      console.warn(`[syncMeta] campaña ${insight.campaign_id} skipeada: spend inválido`)
      continue
    }

    campaigns.push({
      id:    insight.campaign_id,
      name:  insight.campaign_name,
      spend, impressions, clicks, leads, reach, linkClicks, purchases, instagramFollows,
      frequency,
      // CTR de clic en enlace: inline_link_clicks / impressions (no el CTR general de Meta)
      ctr:   impressions > 0 ? linkClicks / impressions : null,
      cpm:   impressions > 0 ? (spend / impressions) * 1000 : null,
      cpl:   leads > 0 ? spend / leads : null,
      cpc:   parseNum(insight.cpc) || null,
      raw:   insight,
    })
  }

  const totalSpend            = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalImpressions      = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks           = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalLeads            = campaigns.reduce((s, c) => s + c.leads, 0)
  const totalReach            = campaigns.reduce((s, c) => s + c.reach, 0)
  const totalLinkClicks       = campaigns.reduce((s, c) => s + c.linkClicks, 0)
  const totalPurchases        = campaigns.reduce((s, c) => s + c.purchases, 0)
  const totalInstagramFollows = campaigns.reduce((s, c) => s + c.instagramFollows, 0)

  const dailyAggregate = {
    spend:            totalSpend,
    impressions:      totalImpressions,
    clicks:           totalClicks,
    leads:            totalLeads,
    reach:            totalReach,
    linkClicks:       totalLinkClicks,
    purchases:        totalPurchases,
    instagramFollows: totalInstagramFollows,
    frequency:        totalReach > 0 ? totalImpressions / totalReach : null,
    ctr:              totalImpressions > 0 ? totalLinkClicks / totalImpressions : null,
    cpm:              totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null,
    cpl:              totalLeads > 0 ? totalSpend / totalLeads : null,
    cpc:              totalClicks > 0 ? totalSpend / totalClicks : null,
    rawData:          campaigns.map(c => c.id),
  }

  await prisma.$transaction([
    prisma.dailyMetric.upsert({
      where:  { clientId_source_date: { clientId, source: 'meta', date: dateObj } },
      update: dailyAggregate,
      create: { clientId, source: 'meta', date: dateObj, ...dailyAggregate },
    }),
    ...campaigns.map(c =>
      prisma.campaignMetricDaily.upsert({
        where:  { clientId_source_campaignId_date: { clientId, source: 'meta', campaignId: c.id, date: dateObj } },
        update: {
          campaignName: c.name,
          spend: c.spend, impressions: c.impressions, clicks: c.clicks, leads: c.leads,
          reach: c.reach, linkClicks: c.linkClicks, purchases: c.purchases, instagramFollows: c.instagramFollows,
          frequency: c.frequency, ctr: c.ctr, cpm: c.cpm, cpl: c.cpl, cpc: c.cpc,
          rawData: c.raw as object,
        },
        create: {
          clientId, source: 'meta', campaignId: c.id, campaignName: c.name, date: dateObj,
          spend: c.spend, impressions: c.impressions, clicks: c.clicks, leads: c.leads,
          reach: c.reach, linkClicks: c.linkClicks, purchases: c.purchases, instagramFollows: c.instagramFollows,
          frequency: c.frequency, ctr: c.ctr, cpm: c.cpm, cpl: c.cpl, cpc: c.cpc,
          rawData: c.raw as object,
        },
      })
    ),
  ])

  return { date: targetDate, campaignsProcessed: campaigns.length, leadsTotal: totalLeads, spendTotal: totalSpend }
}
