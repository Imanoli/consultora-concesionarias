import cron from 'node-cron'
import type { FastifyInstance } from 'fastify'
import prisma from '../db/prisma.js'
import { syncMetaForClient } from '../jobs/syncMeta.js'
import { syncGoogleAdsForClient } from '../jobs/syncGoogleAds.js'
import { syncClarityForClient } from '../jobs/syncClarity.js'
import { syncGa4ForClient } from '../jobs/syncGa4.js'
import { checkAlerts } from '../jobs/checkAlerts.js'
import { runDailyAnalysis } from '../jobs/dailyAnalysis.js'

export function startCron(app: FastifyInstance): void {
  cron.schedule('0 8 * * *', async () => {
    app.log.info('[cron] Iniciando sync diario Meta')

    const clients = await prisma.client.findMany({ where: { active: true } })
    let ok = 0
    let errors = 0

    for (const client of clients) {
      try {
        const result = await syncMetaForClient(client.id)
        app.log.info(
          `[cron] ${client.name}: ${result.campaignsProcessed} campañas, ` +
          `spend $${result.spendTotal.toFixed(2)}, leads ${result.leadsTotal}`
        )
        ok++
      } catch (err) {
        app.log.error(err, `[cron] Error sincronizando ${client.name}`)
        errors++
      }
    }

    app.log.info(`[cron] Meta completado — OK: ${ok}, errores: ${errors}`)

    // Google Ads sync
    for (const client of clients) {
      if (!client.googleAdsCustomerId && !process.env.GOOGLE_ADS_CUSTOMER_ID) continue
      try {
        const result = await syncGoogleAdsForClient(client.id)
        app.log.info(
          `[cron] Google Ads ${client.name}: ${result.campaignsProcessed} campañas, ` +
          `spend $${result.spendTotal.toFixed(2)}, conv ${result.leadsTotal}`
        )
      } catch (err) {
        app.log.error(err, `[cron] Error Google Ads ${client.name}`)
      }
    }

    // Clarity sync
    if (process.env.CLARITY_API_TOKEN) {
      for (const client of clients) {
        try {
          const result = await syncClarityForClient(client.id)
          app.log.info(`[cron] Clarity ${client.name}: ${result.sessions} sesiones, ${result.pageViews} vistas`)
        } catch (err) {
          app.log.error(err, `[cron] Error Clarity ${client.name}`)
        }
      }
    }

    // GA4 sync
    if (process.env.GA4_PROPERTY_ID && process.env.GA4_SERVICE_ACCOUNT_KEY_PATH) {
      for (const client of clients) {
        try {
          const result = await syncGa4ForClient(client.id)
          app.log.info(`[cron] GA4 ${client.name}: ${result.sessions} sesiones, ${result.pageViews} vistas`)
        } catch (err) {
          app.log.error(err, `[cron] Error GA4 ${client.name}`)
        }
      }
    }

    // Alertas: saldo bajo + campañas pausadas
    for (const client of clients) {
      if (!client.metaAdAccountId) continue
      await checkAlerts(client.id, client.name, client.metaAdAccountId, client.googleAdsCustomerId ?? undefined, msg => app.log.info(msg))
    }

    // Análisis diario con Claude
    for (const client of clients) {
      try {
        await runDailyAnalysis(client.id, undefined, msg => app.log.info(msg))
      } catch (err) {
        app.log.error(err, `[analysis] Error en análisis de ${client.name}`)
      }
    }
  }, { timezone: 'America/Argentina/Buenos_Aires' })

  app.log.info('[cron] Registrado: sync diario 8 AM ARG')
}
