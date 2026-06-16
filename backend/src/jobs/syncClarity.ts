import prisma from '../db/prisma.js'
import { fetchClarityInsights, ClarityApiError } from '../services/clarityApi.js'
import { yesterdayArgentina } from '../utils/dates.js'

export interface SyncClarityResult {
  date:     string
  sessions: number
  pageViews: number
  skipped?: boolean
  error?:   string
}

export async function syncClarityForClient(
  clientId: string,
  date?: string,
): Promise<SyncClarityResult> {
  const targetDate = date ?? yesterdayArgentina()
  const dateObj    = new Date(targetDate + 'T00:00:00.000Z')

  let snapshot
  try {
    snapshot = await fetchClarityInsights()
  } catch (err) {
    if (err instanceof ClarityApiError) {
      return { date: targetDate, sessions: 0, pageViews: 0, error: err.message }
    }
    throw err
  }

  await prisma.dailyMetric.upsert({
    where:  { clientId_source_date: { clientId, source: 'clarity', date: dateObj } },
    create: {
      clientId,
      source:      'clarity',
      date:        dateObj,
      sessions:    snapshot.sessions,
      impressions: snapshot.pageViews,
      clicks:      snapshot.distinctUsers,
      rawData:     snapshot.rawData as object,
    },
    update: {
      sessions:    snapshot.sessions,
      impressions: snapshot.pageViews,
      clicks:      snapshot.distinctUsers,
      rawData:     snapshot.rawData as object,
    },
  })

  return { date: targetDate, sessions: snapshot.sessions, pageViews: snapshot.pageViews }
}
