import prisma from '../src/db/prisma.js'

async function main() {
  const rows = await prisma.campaignMetricDaily.findMany({
    where:  { clientId: 'esac' },
    select: { rawData: true },
  })

  const totals = new Map<string, number>()

  for (const row of rows) {
    const raw     = row.rawData as Record<string, unknown>
    const actions = (raw['actions'] ?? []) as Array<{ action_type: string; value: string }>
    for (const a of actions) {
      totals.set(a.action_type, (totals.get(a.action_type) ?? 0) + parseInt(a.value, 10))
    }
  }

  console.log(`\nTodos los action_types en ${rows.length} registros de ESAC:\n`)
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
  for (const [type, total] of sorted) {
    console.log(`  ${type.padEnd(60)} ${total}`)
  }
}

main().finally(() => prisma.$disconnect())
