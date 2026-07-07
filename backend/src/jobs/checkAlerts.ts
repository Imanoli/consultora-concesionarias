import { fetchAccountStatus } from '../services/metaAccountStatus.js'
import { fetchGoogleAdsCampaignStatus } from '../services/googleAdsApi.js'
import { sendAlert } from '../services/email.js'
import prisma from '../db/prisma.js'

// Semáforo Meta (USD): verde >100, amarillo 40-99, rojo <40
const META_RED_USD    = 40

// Semáforo Google Ads (ARS): verde >100.000, amarillo 50.000-99.999, rojo <50.000
const GADS_RED_ARS    = 50_000

async function calcFondos(clientId: string, source: 'meta' | 'google_ads'): Promise<number | null> {
  const latestLoad = await prisma.fundLoad.findFirst({
    where:   { clientId, source },
    orderBy: [{ loadedAt: 'desc' }, { id: 'desc' }],
  })
  if (!latestLoad) return null

  const result = await prisma.dailyMetric.aggregate({
    where: { clientId, source, date: { gte: latestLoad.loadedAt } },
    _sum:  { spend: true },
  })

  const spent = Number(result._sum.spend ?? 0)
  return Math.max(0, Number(latestLoad.amount) - spent)
}

export async function checkAlerts(
  clientId: string,
  clientName: string,
  adAccountId?: string,
  googleAdsCustomerId?: string,
  log: (msg: string) => void = console.log,
): Promise<void> {
  // Estado de campañas Meta (solo para detectar campañas pausadas)
  let status
  try {
    status = await fetchAccountStatus(adAccountId, clientId)
  } catch (err) {
    log(`[alertas] Error al consultar estado de cuenta Meta (${clientName}): ${err}`)
    return
  }

  // Calcular fondos desde fund_loads
  const metaFondos = await calcFondos(clientId, 'meta')
  const gadsFondos = googleAdsCustomerId ? await calcFondos(clientId, 'google_ads') : null

  const activeCampaigns = status.campaigns.filter(c => c.effectiveStatus === 'ACTIVE')

  // Estado de campañas Google Ads — se consulta siempre (no solo con fondos bajos)
  // para poder distinguir "sin fondos" de "campañas pausadas por el cliente" en cualquier alerta.
  let gadsActiveCampaigns: number | null = null
  if (googleAdsCustomerId) {
    try {
      const gadsStatus = await fetchGoogleAdsCampaignStatus(googleAdsCustomerId)
      gadsActiveCampaigns = gadsStatus.filter(c => c.status === 'ENABLED').length
    } catch (err) {
      log(`[alertas] Error al consultar estado campañas Google Ads (${clientName}): ${err}`)
    }
  }

  // Guardar en clients table
  await prisma.client.update({
    where: { id: clientId },
    data: {
      metaFondosUsd:       metaFondos,
      metaFondosUpdatedAt: new Date(),
      metaActiveCampaigns: activeCampaigns.length,
      ...(googleAdsCustomerId ? {
        googleAdsFondosArs:       gadsFondos,
        googleAdsFondosUpdatedAt: new Date(),
        googleAdsActiveCampaigns: gadsActiveCampaigns,
      } : {}),
    },
  })

  if (metaFondos !== null) {
    log(`[alertas] Meta fondos (${clientName}): $${metaFondos.toFixed(2)} ${status.currency}`)
  } else {
    log(`[alertas] Meta fondos (${clientName}): sin carga registrada`)
  }
  if (gadsFondos !== null) {
    log(`[alertas] Google Ads fondos (${clientName}): ARS ${gadsFondos.toFixed(2)}`)
  }

  const alerts: string[] = []

  // Alerta fondos Meta rojos — solo si hay campañas activas corriendo
  if (metaFondos !== null && metaFondos < META_RED_USD && activeCampaigns.length > 0) {
    alerts.push(`
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #eee;">
          <strong style="color:#c0392b">🔴 Meta Ads — Fondos críticos</strong><br>
          Fondos disponibles: <strong>$${metaFondos.toFixed(2)} ${status.currency}</strong><br>
          Por debajo del umbral mínimo ($${META_RED_USD} USD). Recargá antes de que se pasen las campañas.
        </td>
      </tr>
    `)
    log(`[alertas] Meta fondos bajos — campañas activas: ${activeCampaigns.length} (${clientName}): $${metaFondos.toFixed(2)} ${status.currency}`)
  }

  // Alerta campañas pausadas por Meta
  const pausedUnexpected = status.campaigns.filter(
    c => c.status === 'ACTIVE' && c.effectiveStatus === 'PAUSED'
  )
  const pausedByUser = status.campaigns.filter(c => c.status === 'PAUSED')

  if (pausedUnexpected.length > 0) {
    const list = pausedUnexpected.map(c => `<li>${c.name}</li>`).join('')
    alerts.push(`
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #eee;">
          <strong>Campañas pausadas por Meta</strong><br>
          Las siguientes campañas están configuradas como activas pero Meta las pausó
          (puede ser por presupuesto agotado u otras restricciones):<br>
          <ul style="margin:6px 0">${list}</ul>
        </td>
      </tr>
    `)
    log(`[alertas] Campañas pausadas (${clientName}): ${pausedUnexpected.map(c => c.name).join(', ')}`)
  }

  // Alerta fondos Google Ads rojos — solo si hay campañas activas
  if (gadsFondos !== null && gadsFondos < GADS_RED_ARS && (gadsActiveCampaigns ?? 0) > 0) {
    alerts.push(`
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #eee;">
          <strong style="color:#c0392b">🔴 Google Ads — Fondos críticos</strong><br>
          Fondos disponibles: <strong>ARS ${gadsFondos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong><br>
          Por debajo del umbral mínimo (ARS 50.000). Recargá antes de que se pasen las campañas.
        </td>
      </tr>
    `)
    log(`[alertas] Google Ads fondos bajos (${clientName}): ARS ${gadsFondos.toFixed(2)}`)
  }

  if (alerts.length === 0) {
    log(`[alertas] Sin alertas activas (${clientName})`)
    return
  }

  const subject = `[${clientName}] ${alerts.length} alerta${alerts.length > 1 ? 's' : ''} en cuentas publicitarias`

  const metaFondosStr = metaFondos !== null ? `$${metaFondos.toFixed(2)} ${status.currency}` : 'sin datos'

  const html = `
    <div style="font-family:sans-serif; max-width:600px; margin:0 auto; color:#333">
      <h2 style="color:#c0392b; margin-bottom:4px">Alertas de campañas</h2>
      <p style="color:#666; margin-top:0; margin-bottom:16px">
        Cliente: <strong>${clientName}</strong> &nbsp;|&nbsp; Cuenta: ${adAccountId ?? process.env.META_AD_ACCOUNT_ID}
      </p>
      <table style="width:100%; border-collapse:collapse">
        <tbody>
          ${alerts.join('')}
        </tbody>
      </table>
      <p style="margin-top:24px; font-size:12px; color:#999">
        Este mensaje fue enviado automáticamente por el Dashboard IRM.<br>
        Meta fondos: ${metaFondosStr} |
        Campañas activas: ${status.campaigns.filter(c => c.effectiveStatus === 'ACTIVE').length} |
        Pausadas: ${pausedByUser.length + pausedUnexpected.length}
      </p>
    </div>
  `

  try {
    await sendAlert(subject, html)
    log(`[alertas] Email enviado: ${subject}`)
  } catch (err) {
    log(`[alertas] Error enviando email: ${err}`)
  }
}
