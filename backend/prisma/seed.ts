import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const clients = [
  { id: 'esac', name: 'ESAC Energy', industry: 'renewable_energy', active: true },
  { id: 'dakota', name: 'Dakota Cars', industry: 'automotive_retail', active: true },
  { id: 'cg', name: 'CG Cars', industry: 'automotive_retail_digital', active: true },
]

async function main() {
  for (const client of clients) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: { name: client.name, industry: client.industry, active: client.active },
      create: client,
    })
    console.log(`Inserted: ${client.name}`)
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
