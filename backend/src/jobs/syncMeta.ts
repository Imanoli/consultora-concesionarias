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
 * Extrae el conteo de leads sumando los action_types configurados en el cliente.
 *
 * IMPORTANTE: los action_types deben ser mutuamente excluyentes.
 * Si se incluyen tipos que se solapan (ej. "lead" y "onsite_conversion.lead_grouped",
 * donde el segundo agrupa al primero), se producirá doble conteo.
 * Configuraciones seguras típicas:
 *   - Ads a mensajería : ["onsite_conversion.messaging_conversation_started_7d"]
 *   - Lead forms       : ["lead"]
 *   - Ambos (excluyentes entre sí): ["lead", "onsite_conversion.messaging_conversation_started_7d"]
 */
function extractLeads(actions: MetaAction[] | undefined, leadTypes: string[]): number {
  if (!leadTypes.length || !actions?.length) return 0
  return actions
    .filter(a => leadTypes.includes(a.action_type))
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

  const insights = await fetchCampaignInsights(targetDate, client.metaAdAccountId)
  if (insights.length === 0) {
    return { date: targetDate, campaignsProcessed: 0, leadsTotal: 0, spendTotal: 0 }
  }

  type CampaignRow = {
    id: string; name: string
    spend: number; impressions: number; clicks: number; leads: number
    ctr: number | null; cpm: number | null; cpl: number | null
    raw: MetaCampaignInsight
  }

  const campaigns: CampaignRow[] = []

  for (const insight of insights) {
    const spend       = parseNum(insight.spend)
    const impressions = Math.round(parseNum(insight.impressions))
    const clicks      = Math.round(parseNum(insight.clicks))
    const leads       = extractLeads(insight.actions, leadTypes)

    if (isNaN(spend)) {
      console.warn(`[syncMeta] campaña ${insight.campaign_id} skipeada: spend inválido`)
      continue
    }

    campaigns.push({
      id:    insight.campaign_id,
      name:  insight.campaign_name,
      spend, impressions, clicks, leads,
      ctr:   impressions > 0 ? clicks / impressions : null,
      cpm:   impressions > 0 ? (spend / impressions) * 1000 : null,
      cpl:   leads > 0 ? spend / leads : null,
      raw:   insight,
    })
  }

  const totalSpend       = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks      = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalLeads       = campaigns.reduce((s, c) => s + c.leads, 0)

  const dailyAggregate = {
    spend:       totalSpend,
    impressions: totalImpressions,
    clicks:      totalClicks,
    leads:       totalLeads,
    ctr:         totalImpressions > 0 ? totalClicks / totalImpressions : null,
    cpm:         totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null,
    cpl:         totalLeads > 0 ? totalSpend / totalLeads : null,
    rawData:     campaigns.map(c => c.id),
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
          campaignName: c.name, spend: c.spend, impressions: c.impressions,
          clicks: c.clicks, leads: c.leads, ctr: c.ctr, cpm: c.cpm, cpl: c.cpl,
          rawData: c.raw as object,
        },
        create: {
          clientId, source: 'meta', campaignId: c.id, campaignName: c.name, date: dateObj,
          spend: c.spend, impressions: c.impressions, clicks: c.clicks, leads: c.leads,
          ctr: c.ctr, cpm: c.cpm, cpl: c.cpl, rawData: c.raw as object,
        },
      })
    ),
  ])

  return { date: targetDate, campaignsProcessed: campaigns.length, leadsTotal: totalLeads, spendTotal: totalSpend }
}
