import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const clients = [
  {
    id: 'esac',
    name: 'ESAC Energy',
    industry: 'renewable_energy',
    active: true,
    metaAdAccountId: 'act_1428427929077338',
    metaLeadActions: ['onsite_conversion.messaging_conversation_started_7d'],
  },
  {
    id: 'dakota',
    name: 'Dakota Cars',
    industry: 'automotive_retail',
    active: true,
    metaAdAccountId: null,
    metaLeadActions: [],
  },
  {
    id: 'cg',
    name: 'CG Cars',
    industry: 'automotive_retail_digital',
    active: true,
    metaAdAccountId: null,
    metaLeadActions: [],
  },
]

async function main() {
  for (const client of clients) {
    await prisma.client.upsert({
      where:  { id: client.id },
      update: { name: client.name, industry: client.industry, active: client.active, metaAdAccountId: client.metaAdAccountId, metaLeadActions: client.metaLeadActions },
      create: client,
    })
    console.log(`Upserted: ${client.name}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
