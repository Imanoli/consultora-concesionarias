import Anthropic from '@anthropic-ai/sdk'

export interface DaySnapshot {
  date:             string
  spend:            number
  impressions:      number
  reach:            number
  leads:            number
  linkClicks:       number
  ctr:              number | null
  cpl:              number | null
  cpm:              number | null
  cpc:              number | null
  purchases:        number
  instagramFollows: number
  frequency:        number | null
}

export interface AiInsightResult {
  type:     'anomaly' | 'recommendation' | 'summary'
  severity: 'info' | 'warning' | 'critical'
  title:    string
  body:     string
}

function fmt(n: number | null, dec = 2): string {
  return n != null ? n.toFixed(dec) : '—'
}

export interface GadsSnapshot {
  spend:       number  // ARS
  impressions: number
  clicks:      number
  conversions: number
  ctr:         number | null
  cpc:         number | null
}

export interface Ga4Snapshot {
  sessions:        number
  pageViews:       number
  users:           number
  engagedSessions: number
}

export interface ClarityWebSnapshot {
  sessions:       number
  pageViews:      number
  avgScrollDepth: number
  rageClicks:     number
  deadClicks:     number
  mobilePercent:  number
}

function pctDiff(current: number, baseline: number): string {
  if (baseline === 0) return '—'
  const diff = ((current - baseline) / baseline) * 100
  return `${diff > 0 ? '+' : ''}${diff.toFixed(0)}% vs 30d`
}

function buildPrompt(
  clientName: string,
  yesterday:  DaySnapshot,
  last7:      DaySnapshot,
  last30:     DaySnapshot,
  gadsYest?:  GadsSnapshot,
  gads7?:     GadsSnapshot,
  gads30?:    GadsSnapshot,
  ga4Yest?:   Ga4Snapshot,
  ga47?:      Ga4Snapshot,
  clarityYest?: ClarityWebSnapshot,
): string {
  const hasGads    = gadsYest && (gadsYest.impressions > 0 || gadsYest.spend > 0)
  const hasGa4     = ga4Yest  && ga4Yest.sessions > 0
  const hasClarity = clarityYest && clarityYest.sessions > 0

  const gadsSection = hasGads ? `

### Google Ads — ayer (${yesterday.date}) [ARS]
- Inversión: $${fmt(gadsYest!.spend, 0)} | Impresiones: ${gadsYest!.impressions.toLocaleString()} | Clics: ${gadsYest!.clicks} | Conversiones: ${gadsYest!.conversions}
- CTR: ${fmt(gadsYest!.ctr != null ? gadsYest!.ctr * 100 : null)}% | CPC: $${fmt(gadsYest!.cpc, 0)}
- vs promedio 7d → Clics: ${pctDiff(gadsYest!.clicks, gads7?.clicks ?? 0)} | Conversiones: ${pctDiff(gadsYest!.conversions, gads7?.conversions ?? 0)}
- vs promedio 30d → Clics: ${pctDiff(gadsYest!.clicks, gads30?.clicks ?? 0)} | Conversiones: ${pctDiff(gadsYest!.conversions, gads30?.conversions ?? 0)} | CPC: ${pctDiff(gadsYest!.cpc ?? 0, gads30?.cpc ?? 0)}` : ''

  const complementSection = (hasGa4 || hasClarity) ? `

### Datos complementarios — ayer
${hasGa4 ? `GA4: ${ga4Yest!.sessions} sesiones | ${ga4Yest!.users} usuarios | ${ga4Yest!.pageViews} páginas vistas | ${ga4Yest!.sessions > 0 ? Math.round((ga4Yest!.engagedSessions / ga4Yest!.sessions) * 100) : 0}% engagement (promedio 7d: ${fmt(ga47?.sessions ?? 0, 0)} sesiones/día)` : ''}
${hasClarity ? `Clarity: scroll promedio ${clarityYest!.avgScrollDepth}% | ${clarityYest!.mobilePercent}% móvil | rage clicks: ${clarityYest!.rageClicks} | dead clicks: ${clarityYest!.deadClicks}` : ''}` : ''

  return `Sos un analista senior de marketing digital especializado en paid media para empresas de energía solar.

CLIENTE: ${clientName} — empresa de energía solar. El objetivo es generar leads calificados de personas interesadas en instalar paneles solares.

REGLAS DEL ANÁLISIS (respetarlas estrictamente):
1. Meta Ads y Google Ads son las plataformas primarias del análisis. Generá al menos un insight por cada una.
2. El presupuesto de cada plataforma es fijo y planificado. NUNCA recomendes redistribuir presupuesto entre Meta y Google Ads.
3. GA4 y Clarity son datos complementarios: usalos para reforzar o contextualizar los insights de paid media, no como foco principal.
4. Para detectar anomalías, comparar el día de ayer con el promedio de 7 días y 30 días. Una anomalía es una desviación >20% en métricas clave (CPL, CTR, conversiones).
5. Las recomendaciones deben ser específicas y accionables: mencionar qué ajustar (creative, audiencia, puja, horario, landing) no solo describir el problema.

---

### Meta Ads — ayer (${yesterday.date}) [USD]
- Inversión: $${fmt(yesterday.spend)} | Alcance: ${yesterday.reach.toLocaleString()} | Impresiones: ${yesterday.impressions.toLocaleString()} | Frecuencia: ${fmt(yesterday.frequency)}x
- Leads: ${yesterday.leads} | CPL: $${fmt(yesterday.cpl)} | CTR: ${fmt(yesterday.ctr != null ? yesterday.ctr * 100 : null)}% | CPC: $${fmt(yesterday.cpc)} | CPM: $${fmt(yesterday.cpm)}
- vs promedio 7d → Leads: ${pctDiff(yesterday.leads, last7.leads)} | CPL: ${pctDiff(yesterday.cpl ?? 0, last7.cpl ?? 0)} | CTR: ${pctDiff(yesterday.ctr ?? 0, last7.ctr ?? 0)}
- vs promedio 30d → Leads: ${pctDiff(yesterday.leads, last30.leads)} | CPL: ${pctDiff(yesterday.cpl ?? 0, last30.cpl ?? 0)} | CTR: ${pctDiff(yesterday.ctr ?? 0, last30.ctr ?? 0)} | Frecuencia: ${pctDiff(yesterday.frequency ?? 0, last30.frequency ?? 0)}
- Promedio 30d: inversión/día $${fmt(last30.spend)} | leads/día ${fmt(last30.leads, 1)} | CPL $${fmt(last30.cpl)} | frecuencia ${fmt(last30.frequency)}x${gadsSection}${complementSection}

---

Respondé ÚNICAMENTE con un array JSON válido. Sin texto antes ni después. Sin markdown. Sin \`\`\`.
Generá entre 4 y 6 insights. Cada elemento:
- "type": "anomaly" (métrica fuera de rango histórico) | "recommendation" (acción de optimización) | "summary" (balance general del día)
- "severity": "critical" (CPL >30% vs 30d, CTR <-30% vs 30d, frecuencia >3.5, leads=0 con gasto) | "warning" (desvíos 15-30%, frecuencia 2.5-3.5) | "info" (normal o positivo)
- "title": máx 80 caracteres
- "body": análisis concreto + acción específica a tomar, máx 450 caracteres

Incluir siempre un "summary" como último elemento con el balance general del día en todas las plataformas activas.`
}

export async function analyzeWithClaude(
  clientName:   string,
  yesterday:    DaySnapshot,
  last7:        DaySnapshot,
  last30:       DaySnapshot,
  gadsYest?:    GadsSnapshot,
  gads7?:       GadsSnapshot,
  gads30?:      GadsSnapshot,
  ga4Yest?:     Ga4Snapshot,
  ga47?:        Ga4Snapshot,
  clarityYest?: ClarityWebSnapshot,
): Promise<{ insights: AiInsightResult[]; rawPrompt: string; rawResponse: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const rawPrompt = buildPrompt(clientName, yesterday, last7, last30, gadsYest, gads7, gads30, ga4Yest, ga47, clarityYest)

  const msg = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2000,
    messages:   [{ role: 'user', content: rawPrompt }],
  })

  const rawResponse = msg.content[0].type === 'text' ? msg.content[0].text : ''

  let insights: AiInsightResult[] = []
  try {
    const parsed = JSON.parse(rawResponse)
    if (Array.isArray(parsed)) {
      insights = parsed.filter(
        i => i.type && i.severity && i.title && i.body
      ) as AiInsightResult[]
    }
  } catch {
    const match = rawResponse.match(/\[[\s\S]*\]/)
    if (match) {
      insights = JSON.parse(match[0]) as AiInsightResult[]
    }
  }

  return { insights, rawPrompt, rawResponse }
}
