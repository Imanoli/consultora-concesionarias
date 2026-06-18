import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../db/prisma.js'

const bodySchema = z.object({
  clientId: z.string().min(1),
  source:   z.enum(['meta', 'google_ads']),
  amount:   z.number().positive(),
  currency: z.string().min(1).max(5),
  loadedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:    z.string().max(200).optional(),
})

export async function fundLoadRoutes(app: FastifyInstance) {
  app.post('/api/fund-loads', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: parsed.error.issues })
    }
    const { clientId, source, amount, currency, loadedAt, notes } = parsed.data
    const loadedAtDate = new Date(loadedAt + 'T00:00:00.000Z')

    await prisma.fundLoad.create({
      data: { clientId, source, amount, currency, loadedAt: loadedAtDate, notes },
    })

    // Recalcular fondos restantes y actualizar la tabla clients
    const result = await prisma.dailyMetric.aggregate({
      where: { clientId, source, date: { gte: loadedAtDate } },
      _sum:  { spend: true },
    })
    const spent  = Number(result._sum.spend ?? 0)
    const fondos = Math.max(0, amount - spent)

    if (source === 'meta') {
      await prisma.client.update({
        where: { id: clientId },
        data:  { metaFondosUsd: fondos, metaFondosUpdatedAt: new Date() },
      })
    } else {
      await prisma.client.update({
        where: { id: clientId },
        data:  { googleAdsFondosArs: fondos, googleAdsFondosUpdatedAt: new Date() },
      })
    }

    return { ok: true, fondos }
  })
}
