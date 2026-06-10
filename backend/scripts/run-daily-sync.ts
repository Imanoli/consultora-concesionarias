// Trigger manual de la lógica del cron diario
// Uso: npx tsx scripts/run-daily-sync.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { syncMetaForClient } from '../src/jobs/syncMeta.js'

const prisma = new PrismaClient()

async function main() {
  const clients = await prisma.client.findMany({ where: { active: true } })
  console.log(`\n— Sync Manual Diario — ${clients.length} clientes activos\n`)

  let ok = 0
  let errors = 0

  for (const client of clients) {
    process.stdout.write(`${client.name}... `)
    try {
      const result = await syncMetaForClient(client.id)
      if (result.campaignsProcessed === 0) {
        console.log(`sin datos Meta (cuenta no configurada o sin actividad ayer)`)
      } else {
        console.log(`OK — ${result.campaignsProcessed} campañas, spend $${result.spendTotal.toFixed(2)}, leads ${result.leadsTotal}`)
      }
      ok++
    } catch (err) {
      console.log(`ERROR — ${(err as Error).message}`)
      errors++
    }
  }

  console.log(`\nResumen: ${ok} OK, ${errors} errores`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
