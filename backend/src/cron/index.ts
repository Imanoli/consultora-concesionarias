import cron from 'node-cron'
import type { FastifyInstance } from 'fastify'
import prisma from '../db/prisma.js'
import { syncMetaForClient } from '../jobs/syncMeta.js'

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

    app.log.info(`[cron] Completado — OK: ${ok}, errores: ${errors}`)
  }, { timezone: 'America/Argentina/Buenos_Aires' })

  app.log.info('[cron] Registrado: sync diario 8 AM ARG')
}
