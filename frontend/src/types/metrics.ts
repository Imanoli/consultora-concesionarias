export interface Client {
  id:                   string
  name:                 string
  industry:             string
  active:               boolean
  metaFondosUsd:        number | null
  metaFondosUpdatedAt:  string | null
}

export interface KpiSet {
  spend:            number
  leads:            number
  impressions:      number
  clicks:           number
  reach:            number
  linkClicks:       number
  purchases:        number
  instagramFollows: number
  sessions:         number
  conversions:      number
  frequency:        number | null
  ctr:              number | null
  cpm:              number | null
  cpl:              number | null
  cpc:              number | null
  cpr:              number | null
  costPerFollower:  number | null
  costPerPurchase:  number | null
}

export interface MetricsResponse {
  period:   { from: string; to: string }
  current:  KpiSet
  previous: KpiSet
  change: {
    spend:            number | null
    leads:            number | null
    impressions:      number | null
    clicks:           number | null
    reach:            number | null
    linkClicks:       number | null
    purchases:        number | null
    instagramFollows: number | null
    sessions:         number | null
    conversions:      number | null
    ctr:              number | null
    cpm:              number | null
    cpl:              number | null
    cpc:              number | null
  }
}

export interface DailyDataPoint {
  date:             string
  spend:            number
  impressions:      number
  clicks:           number
  leads:            number
  reach:            number
  linkClicks:       number
  purchases:        number
  instagramFollows: number
  frequency:        number | null
  ctr:              number | null
  cpm:              number | null
  cpl:              number | null
  cpc:              number | null
}

export interface DailyMetricsResponse {
  period: { from: string; to: string }
  data:   DailyDataPoint[]
}

export interface CampaignData {
  campaignId:       string
  campaignName:     string
  spend:            number
  impressions:      number
  clicks:           number
  leads:            number
  reach:            number
  linkClicks:       number
  purchases:        number
  instagramFollows: number
  frequency:        number | null
  ctr:              number | null
  cpm:              number | null
  cpl:              number | null
  cpc:              number | null
  costPerFollower:  number | null
  costPerPurchase:  number | null
}

export interface CampaignsResponse {
  period: { from: string; to: string }
  data:   CampaignData[]
}
