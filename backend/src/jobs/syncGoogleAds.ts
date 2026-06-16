import prisma from '../db/prisma.js'
import { fetchGoogleAdsCampaigns } from '../services/googleAdsApi.js'
import { yesterdayArgentina } from '../utils/dates.js'

export interface SyncGoogleAdsResult {
  date:               string
  campaignsProcessed: number
  leadsTotal:         number
  spendTotal:         number
}

export async function syncGoogleAdsForClient(
  clientId: string,
  date?: string,
): Promise<SyncGoogleAdsResult> {
  const targetDate = date ?? yesterdayArgentina()
  const dateObj    = new Date(targetDate + 'T00:00:00.000Z')

  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } })

  const customerId = client.googleAdsCustomerId ?? process.env.GOOGLE_ADS_CUSTOMER_ID
  if (!customerId) {
    return { date: targetDate, campaignsProcessed: 0, leadsTotal: 0, spendTotal: 0 }
  }

  const campaigns = await fetchGoogleAdsCampaigns(customerId, targetDate)

  if (campaigns.length === 0) {
    return { date: targetDate, campaignsProcessed: 0, leadsTotal: 0, spendTotal: 0 }
  }

  const totalSpend       = campaigns.reduce((s, c) => s + c.spend,       0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalClicks      = campaigns.reduce((s, c) => s + c.clicks,      0)
  const totalLeads       = campaigns.reduce((s, c) => s + c.conversions, 0)

  const dailyAggregate = {
    spend:       totalSpend,
    impressions: totalImpressions,
    clicks:      totalClicks,
    leads:       totalLeads,
    linkClicks:  totalClicks,
    ctr:         totalImpressions > 0 ? totalClicks / totalImpressions : null,
    cpm:         totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null,
    cpl:         totalLeads > 0 ? totalSpend / totalLeads : null,
    cpc:         totalClicks > 0 ? totalSpend / totalClicks : null,
    rawData:     campaigns.map(c => c.campaignId),
  }

  await prisma.$transaction([
    prisma.dailyMetric.upsert({
      where:  { clientId_source_date: { clientId, source: 'google_ads', date: dateObj } },
      update: dailyAggregate,
      create: { clientId, source: 'google_ads', date: dateObj, ...dailyAggregate },
    }),
    ...campaigns.map(c =>
      prisma.campaignMetricDaily.upsert({
        where: {
          clientId_source_campaignId_date: {
            clientId, source: 'google_ads', campaignId: c.campaignId, date: dateObj,
          },
        },
        update: {
          campaignName: c.campaignName,
          spend:        c.spend,
          impressions:  c.impressions,
          clicks:       c.clicks,
          leads:        c.conversions,
          linkClicks:   c.clicks,
          ctr:          c.ctr,
          cpm:          c.cpm,
          cpl:          c.conversions > 0 ? c.spend / c.conversions : null,
          cpc:          c.cpc,
        },
        create: {
          clientId,
          source:       'google_ads',
          campaignId:   c.campaignId,
          campaignName: c.campaignName,
          date:         dateObj,
          spend:        c.spend,
          impressions:  c.impressions,
          clicks:       c.clicks,
          leads:        c.conversions,
          linkClicks:   c.clicks,
          ctr:          c.ctr,
          cpm:          c.cpm,
          cpl:          c.conversions > 0 ? c.spend / c.conversions : null,
          cpc:          c.cpc,
        },
      })
    ),
  ])

  return {
    date:               targetDate,
    campaignsProcessed: campaigns.length,
    leadsTotal:         totalLeads,
    spendTotal:         totalSpend,
  }
}
