import { fetchAccountStatus } from '../services/metaAccountStatus.js'
import { fetchGoogleAdsBalance } from '../services/googleAdsApi.js'
import { sendAlert } from '../services/email.js'
import prisma from '../db/prisma.js'

// Semáforo Meta (USD): verde >100, amarillo 40-99, rojo <40
const META_RED_USD    = 40
const META_YELLOW_USD = 100

// Semáforo Google Ads (ARS): verde >100.000, amarillo 50.000-99.999, rojo <50.000
const GADS_RED_ARS    = 50_000
const GADS_YELLOW_ARS = 100_000

export async function checkAlerts(
  clientId: string,
  clientName: string,
  adAccountId?: string,
  googleAdsCustomerId?: string,
  log: (msg: string) => void = console.log,
): Promise<void> {
  let status
  try {
    status = await fetchAccountStatus(adAccountId)
  } catch (err) {
    log(`[alertas] Error al consultar estado de cuenta Meta (${clientName}): ${err}`)
    return
  }

  // Guardar fondos Meta en la DB
  await prisma.client.update({
    where: { id: clientId },
    data: {
      metaFondosUsd:       status.fondosDisponibles,
      metaFondosUpdatedAt: new Date(),
    },
  })

  // Obtener saldo Google Ads — usa el ID del cliente o el env var como fallback
  const resolvedGadsId = googleAdsCustomerId ?? process.env.GOOGLE_ADS_CUSTOMER_ID
  let gadsBalance: number | null = null
  if (resolvedGadsId) {
    try {
      gadsBalance = await fetchGoogleAdsBalance(resolvedGadsId)
      if (gadsBalance !== null) {
        log(`[alertas] Google Ads saldo (${clientName}): ARS ${gadsBalance.toFixed(2)}`)
      } else {
        log(`[alertas] Google Ads saldo no disponible via API (${clientName}) — cuenta con presupuesto ilimitado`)
      }
    } catch (err) {
      log(`[alertas] Error al consultar saldo Google Ads (${clientName}): ${err}`)
      // gadsBalance queda null — se guarda null en la DB para limpiar valores viejos
    }
    // Siempre guardar, incluso null (limpia valores obsoletos como el 0 de presupuesto ilimitado)
    await prisma.client.update({
      where: { id: clientId },
      data: {
        googleAdsFondosArs:       gadsBalance,
        googleAdsFondosUpdatedAt: new Date(),
      },
    })
  }

  const alerts: string[] = []

  // Alerta fondos Meta rojos
  if (status.fondosDisponibles < META_RED_USD) {
    alerts.push(`
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #eee;">
          <strong style="color:#c0392b">🔴 Meta Ads — Fondos críticos</strong><br>
          Fondos disponibles: <strong>$${status.fondosDisponibles.toFixed(2)} USD</strong><br>
          Por debajo del umbral mínimo ($${META_RED_USD} USD). Recargá antes de que se pasen las campañas.
        </td>
      </tr>
    `)
    log(`[alertas] Fondos bajos (${clientName}): $${status.fondosDisponibles.toFixed(2)} ${status.currency}`)
  }

  // Alerta de campañas pausadas por Meta (status ACTIVE pero efectivamente PAUSED)
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

  // Alerta fondos Google Ads rojos
  if (gadsBalance !== null && gadsBalance < GADS_RED_ARS) {
    alerts.push(`
      <tr>
        <td style="padding:10px 0; border-bottom:1px solid #eee;">
          <strong style="color:#c0392b">🔴 Google Ads — Fondos críticos</strong><br>
          Fondos disponibles: <strong>ARS ${gadsBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong><br>
          Por debajo del umbral mínimo (ARS 50.000). Recargá antes de que se pasen las campañas.
        </td>
      </tr>
    `)
    log(`[alertas] Google Ads fondos bajos (${clientName}): ARS ${gadsBalance.toFixed(2)}`)
  }

  if (alerts.length === 0) {
    log(`[alertas] Sin alertas activas (${clientName})`)
    return
  }

  const subject = `[${clientName}] ${alerts.length} alerta${alerts.length > 1 ? 's' : ''} en cuentas publicitarias`

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
        Fondos disponibles: $${status.fondosDisponibles.toFixed(2)} ${status.currency} |
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
