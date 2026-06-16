import { BetaAnalyticsDataClient } from '@google-analytics/data'
import path from 'path'
import fs from 'fs'

export interface Ga4Snapshot {
  sessions:     number
  users:        number
  newUsers:     number
  pageViews:    number
  engagedSessions: number
  avgEngagementTimeSec: number
  bounceRate:   number | null
}

export class Ga4ApiError extends Error {
  constructor(message: string) { super(message) }
}

function getClient(): BetaAnalyticsDataClient {
  const keyPath = process.env.GA4_SERVICE_ACCOUNT_KEY_PATH
  if (!keyPath) throw new Ga4ApiError('GA4_SERVICE_ACCOUNT_KEY_PATH no configurado')

  const resolved = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath)
  if (!fs.existsSync(resolved)) throw new Ga4ApiError(`Service account no encontrado: ${resolved}`)

  return new BetaAnalyticsDataClient({ keyFilename: resolved })
}

export async function fetchGa4Metrics(propertyId: string, date: string): Promise<Ga4Snapshot> {
  const client = getClient()

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: date, endDate: date }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'engagedSessions' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ],
  })

  const row = response.rows?.[0]
  if (!row) return { sessions: 0, users: 0, newUsers: 0, pageViews: 0, engagedSessions: 0, avgEngagementTimeSec: 0, bounceRate: null }

  const v = (i: number) => Number(row.metricValues?.[i]?.value ?? 0)

  return {
    sessions:             v(0),
    users:                v(1),
    newUsers:             v(2),
    pageViews:            v(3),
    engagedSessions:      v(4),
    avgEngagementTimeSec: Math.round(v(5)),
    bounceRate:           v(6) || null,
  }
}
