import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import prisma from '../db/prisma.js'

export async function authVerifyRoutes(app: FastifyInstance) {
  app.post('/api/auth/verify', async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string }

    if (!email || !password) {
      return reply.status(400).send({ error: 'Faltan credenciales' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Credenciales inválidas' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Credenciales inválidas' })
    }

    return { id: user.id, email: user.email, role: user.role, clientId: user.clientId }
  })
}
