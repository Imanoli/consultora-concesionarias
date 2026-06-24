import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../db/prisma.js'

const upsertSchema = z.object({
  clientId:   z.string().min(1),
  year:       z.number().int().min(2024).max(2099),
  month:      z.number().int().min(1).max(12),
  amountArs:  z.number().positive(),
  usdArsRate: z.number().positive(),
  notes:      z.string().max(200).optional(),
})

export async function revenueRoutes(app: FastifyInstance) {
  // GET /api/revenue?clientId=X&year=Y&month=M
  app.get('/api/revenue', async (request, reply) => {
    const { clientId, year, month } = request.query as Record<string, string>
    if (!clientId || !year || !month) {
      return reply.status(400).send({ error: 'Faltan parámetros' })
    }
    const entry = await prisma.revenueEntry.findUnique({
      where: { clientId_year_month: { clientId, year: Number(year), month: Number(month) } },
    })
    return entry ?? { amountArs: null, usdArsRate: null, notes: null }
  })

  // POST /api/revenue  — crea o actualiza (upsert)
  app.post('/api/revenue', async (request, reply) => {
    const parsed = upsertSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: parsed.error.issues })
    }
    const { clientId, year, month, amountArs, usdArsRate, notes } = parsed.data

    const entry = await prisma.revenueEntry.upsert({
      where:  { clientId_year_month: { clientId, year, month } },
      create: { clientId, year, month, amountArs, usdArsRate, notes },
      update: { amountArs, usdArsRate, notes, updatedAt: new Date() },
    })
    return { ok: true, entry }
  })
}
