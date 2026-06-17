import { GoogleAdsApi } from 'google-ads-api'

function getClient(): GoogleAdsApi {
  return new GoogleAdsApi({
    client_id:       process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret:   process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  })
}

export async function fetchGoogleAdsBalance(customerId: string): Promise<number | null> {
  const client   = getClient()
  const loginId  = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  const customer = client.Customer({
    customer_id:   customerId,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    ...(loginId ? { login_customer_id: loginId } : {}),
  })

  const results = await customer.query(`
    SELECT
      account_budget.adjusted_spending_limit_micros,
      account_budget.adjusted_spending_limit_type,
      account_budget.amount_served_micros,
      account_budget.status
    FROM account_budget
    WHERE account_budget.status = 'APPROVED'
    LIMIT 1
  `)

  if (results.length === 0) return null
  const budget    = (results[0] as any).account_budget
  const limitType = String(budget?.adjusted_spending_limit_type ?? 'INFINITE')
  if (limitType === 'INFINITE') return null
  const limit  = Number(budget?.adjusted_spending_limit_micros ?? 0)
  const served = Number(budget?.amount_served_micros ?? 0)
  return Math.max(0, limit - served) / 1_000_000
}

export interface GoogleAdsCampaignRow {
  campaignId:   string
  campaignName: string
  status:       string
  spend:        number
  impressions:  number
  clicks:       number
  conversions:  number
  ctr:          number | null
  cpm:          number | null
  cpc:          number | null
}

export class GoogleAdsApiError extends Error {
  constructor(public code: number, public details: string) {
    super(`[GoogleAds] API error ${code}: ${details}`)
  }
}

export async function fetchGoogleAdsCampaigns(
  customerId: string,
  date: string,
): Promise<GoogleAdsCampaignRow[]> {
  const client   = getClient()
  const loginId  = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID

  const customer = client.Customer({
    customer_id:       customerId,
    refresh_token:     process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    ...(loginId ? { login_customer_id: loginId } : {}),
  })

  const results = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm
    FROM campaign
    WHERE segments.date = '${date}'
      AND campaign.status != 'REMOVED'
      AND metrics.impressions > 0
  `)

  return results.map(r => {
    const costMicros   = Number(r.metrics?.cost_micros   ?? 0)
    const avgCpcMicros = Number(r.metrics?.average_cpc   ?? 0)
    const avgCpmMicros = Number(r.metrics?.average_cpm   ?? 0)
    const impressions  = Number(r.metrics?.impressions   ?? 0)
    const clicks       = Number(r.metrics?.clicks        ?? 0)

    return {
      campaignId:   String(r.campaign?.id ?? ''),
      campaignName: String(r.campaign?.name ?? ''),
      status:       String(r.campaign?.status ?? ''),
      spend:        costMicros   / 1_000_000,
      impressions,
      clicks,
      conversions:  Number(r.metrics?.conversions ?? 0),
      ctr:          impressions > 0 ? Number(r.metrics?.ctr ?? 0) : null,
      cpm:          impressions > 0 ? avgCpmMicros / 1_000_000 : null,
      cpc:          clicks > 0      ? avgCpcMicros / 1_000_000 : null,
    }
  })
}
