import type { FastifyInstance } from 'fastify'
import prisma from '../db/prisma.js'

export async function clientRoutes(app: FastifyInstance) {
  app.get('/api/clients', async (request, reply) => {
    try {
      const clients = await prisma.client.findMany({
        orderBy: { id: 'asc' },
      })
      return clients.map(c => ({
        ...c,
        metaFondosUsd:      c.metaFondosUsd      !== null ? Number(c.metaFondosUsd)      : null,
        googleAdsFondosArs: c.googleAdsFondosArs !== null ? Number(c.googleAdsFondosArs) : null,
      }))
    } catch (err) {
      app.log.error(err, 'Error al obtener clients')
      return reply.status(500).send({ error: 'Error interno del servidor' })
    }
  })
}
