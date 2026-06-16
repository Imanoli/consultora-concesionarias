import prisma from '../db/prisma.js'
import { fetchGa4Metrics, Ga4ApiError } from '../services/ga4Api.js'
import { yesterdayArgentina } from '../utils/dates.js'

export interface SyncGa4Result {
  date:     string
  sessions: number
  pageViews: number
  skipped?: boolean
  error?:   string
}

export async function syncGa4ForClient(
  clientId: string,
  date?: string,
): Promise<SyncGa4Result> {
  const targetDate = date ?? yesterdayArgentina()
  const dateObj    = new Date(targetDate + 'T00:00:00.000Z')

  const propertyId = process.env.GA4_PROPERTY_ID
  if (!propertyId) {
    return { date: targetDate, sessions: 0, pageViews: 0, skipped: true, error: 'GA4_PROPERTY_ID no configurado' }
  }

  let snapshot
  try {
    snapshot = await fetchGa4Metrics(propertyId, targetDate)
  } catch (err) {
    if (err instanceof Ga4ApiError) {
      return { date: targetDate, sessions: 0, pageViews: 0, error: err.message }
    }
    throw err
  }

  await prisma.dailyMetric.upsert({
    where:  { clientId_source_date: { clientId, source: 'ga4', date: dateObj } },
    create: {
      clientId,
      source:      'ga4',
      date:        dateObj,
      sessions:    snapshot.sessions,
      impressions: snapshot.pageViews,
      clicks:      snapshot.users,
      conversions: snapshot.engagedSessions,
      rawData:     snapshot as object,
    },
    update: {
      sessions:    snapshot.sessions,
      impressions: snapshot.pageViews,
      clicks:      snapshot.users,
      conversions: snapshot.engagedSessions,
      rawData:     snapshot as object,
    },
  })

  return { date: targetDate, sessions: snapshot.sessions, pageViews: snapshot.pageViews }
}
