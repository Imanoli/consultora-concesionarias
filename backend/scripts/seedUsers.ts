// Correr una vez: npx tsx scripts/seedUsers.ts
import bcrypt from 'bcryptjs'
import prisma from '../src/db/prisma.js'

const SALT_ROUNDS = 12

const users = [
  {
    email:    process.env.AUTH_USER_EMAIL ?? 'admin',
    password: process.env.AUTH_USER_PASSWORD ?? 'changeme',
    role:     'admin',
    clientId: null,
  },
  {
    email:    'esac',
    password: 'Esac2026',
    role:     'client',
    clientId: 'esac',
  },
]

async function main() {
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS)
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { passwordHash, role: u.role, clientId: u.clientId },
      create: { email: u.email, passwordHash, role: u.role, clientId: u.clientId },
    })
    console.log(`Usuario creado/actualizado: ${u.email} (${u.role})`)
  }
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
