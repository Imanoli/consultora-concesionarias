// Backfill histórico de Meta Ads por cliente
// Uso:
//   npx tsx scripts/backfill-meta.ts <clientId>
//   npx tsx scripts/backfill-meta.ts <clientId> --from YYYY-MM-DD
//   npx tsx scripts/backfill-meta.ts <clientId> --from YYYY-MM-DD --to YYYY-MM-DD
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { syncMetaForClient } from '../src/jobs/syncMeta.js'
import { MetaApiError } from '../src/services/metaApi.js'
import { yesterdayArgentina } from '../src/utils/dates.js'

const prisma           = new PrismaClient()
const RATE_LIMIT_CODES = new Set([17, 32, 613])
const LOG_EVERY        = 10

function parseArgs(): { clientId: string; from?: string; to?: string } {
  const args     = process.argv.slice(2)
  const clientId = args[0]
  if (!clientId || clientId.startsWith('--')) {
    console.error('Uso: npx tsx scripts/backfill-meta.ts <clientId> [--from YYYY-MM-DD] [--to YYYY-MM-DD]')
    process.exit(1)
  }
  let from: string | undefined
  let to:   string | undefined
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) from = args[++i]
    if (args[i] === '--to'   && args[i + 1]) to   = args[++i]
  }
  return { clientId, from, to }
}

function daysAgoArgentina(n: number): string {
  const now = new Date()
  const arg = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  arg.setUTCDate(arg.getUTCDate() - n)
  return arg.toISOString().split('T')[0]
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  const cur = new Date(from + 'T00:00:00.000Z')
  const end = new Date(to   + 'T00:00:00.000Z')
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function syncWithRetry(clientId: string, date: string): Promise<number> {
  try {
    const r = await syncMetaForClient(clientId, date)
    return r.campaignsProcessed
  } catch (err) {
    if (err instanceof MetaApiError && RATE_LIMIT_CODES.has(err.code)) {
      process.stdout.write(`\n  rate limit [${err.code}] — esperando 60s... `)
      await sleep(60_000)
      const r = await syncMetaForClient(clientId, date)
      return r.campaignsProcessed
    }
    throw err
  }
}

async function main() {
  const { clientId, from, to } = parseArgs()

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) {
    console.error(`Cliente '${clientId}' no encontrado`)
    process.exit(1)
  }
  if (!client.metaAdAccountId) {
    console.error(`${client.name} no tiene cuenta de Meta configurada`)
    process.exit(1)
  }

  const fromDate = from ?? daysAgoArgentina(60)
  const toDate   = to   ?? yesterdayArgentina()
  const dates    = dateRange(fromDate, toDate)

  console.log(`\n— Backfill Meta Ads —`)
  console.log(`Cliente : ${client.name}`)
  console.log(`Rango   : ${fromDate} → ${toDate} (${dates.length} días)\n`)

  let withData = 0
  let noData   = 0
  let errors   = 0

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    try {
      const count = await syncWithRetry(clientId, date)
      count > 0 ? withData++ : noData++
    } catch (err) {
      const msg = err instanceof MetaApiError
        ? `[${err.code}] ${err.message}`
        : (err as Error).message
      process.stdout.write(`\n  ${date} ERROR — ${msg}\n`)
      errors++
    }

    if ((i + 1) % LOG_EVERY === 0 || i === dates.length - 1) {
      console.log(`  ${date}  [${i + 1}/${dates.length}] con datos: ${withData} | sin datos: ${noData} | errores: ${errors}`)
    }

    if (i < dates.length - 1) await sleep(200)
  }

  console.log(`\nFinalizado — con datos: ${withData}, sin datos: ${noData}, errores: ${errors}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
