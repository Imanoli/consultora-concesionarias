import 'dotenv/config'

export interface ClarityMetric {
  metricName: string
  information: Record<string, unknown>[]
}

export interface ClaritySnapshot {
  sessions:        number
  botSessions:     number
  distinctUsers:   number
  pageViews:       number
  pagesPerSession: number
  avgScrollDepth:  number
  totalTimeSec:    number
  activeTimeSec:   number
  rageClicks:      number
  deadClicks:      number
  errorClicks:     number
  mobilePercent:   number
  rawData:         ClarityMetric[]
}

export class ClarityApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function fetchClarityInsights(
  projectId?: string,
  token?: string,
): Promise<ClaritySnapshot> {
  const pid = projectId ?? process.env.CLARITY_PROJECT_ID
  const tok = token   ?? process.env.CLARITY_API_TOKEN

  if (!pid || !tok) throw new ClarityApiError(0, 'CLARITY_PROJECT_ID o CLARITY_API_TOKEN no configurados')

  const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?project=${pid}&numOfDays=1`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })

  if (!res.ok) throw new ClarityApiError(res.status, `Clarity API ${res.status}`)

  const metrics: ClarityMetric[] = await res.json()

  const get = (name: string) => metrics.find(m => m.metricName === name)?.information ?? []

  const traffic = get('Traffic')[0] as Record<string, unknown> | undefined
  const scroll  = get('ScrollDepth')[0] as { averageScrollDepth?: number } | undefined
  const time    = get('EngagementTime')[0] as Record<string, unknown> | undefined
  const rage    = get('RageClickCount')[0] as Record<string, unknown> | undefined
  const dead    = get('DeadClickCount')[0] as Record<string, unknown> | undefined
  const errClk  = get('ErrorClickCount')[0] as Record<string, unknown> | undefined
  const devices = get('Device') as Array<{ name: string; sessionsCount: string }>
  const pages   = get('PopularPages') as Array<{ visitsCount: number }>

  const totalSessions  = Number(traffic?.totalSessionCount  ?? 0)
  const mobileCount    = Number(devices.find(d => d.name === 'Mobile')?.sessionsCount ?? 0)
  const pcCount        = Number(devices.find(d => d.name === 'PC')?.sessionsCount ?? 0)
  const deviceTotal    = mobileCount + pcCount || 1

  return {
    sessions:        totalSessions,
    botSessions:     Number(traffic?.totalBotSessionCount ?? 0),
    distinctUsers:   Number(traffic?.distinctUserCount ?? 0),
    pageViews:       pages.reduce((s, p) => s + Number(p.visitsCount ?? 0), 0),
    pagesPerSession: Number(traffic?.pagesPerSessionPercentage ?? 0),
    avgScrollDepth:  scroll?.averageScrollDepth ?? 0,
    totalTimeSec:    Number(time?.totalTime ?? 0),
    activeTimeSec:   Number(time?.activeTime ?? 0),
    rageClicks:      Number(rage?.subTotal ?? 0),
    deadClicks:      Number(dead?.subTotal ?? 0),
    errorClicks:     Number(errClk?.subTotal ?? 0),
    mobilePercent:   Math.round((mobileCount / deviceTotal) * 100),
    rawData:         metrics,
  }
}
