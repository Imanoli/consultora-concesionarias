import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import prisma from '../db/prisma.js'
import { fetchLeadContact, addLeadNote, setQuoteLinkField, KommoApiError } from '../services/kommoApi.js'
import { buildQuotePdf } from '../services/quotePdf.js'

const PAYMENT_METHODS = ['efectivo', 'financiado', 'permuta', 'mixto'] as const

const tradeInSchema = z.object({
  make:  z.string().min(1),
  model: z.string().min(1),
  year:  z.number().int(),
  km:    z.number().int().nonnegative().optional(),
  value: z.number().nonnegative(),
})

const financingSchema = z.object({
  entity:            z.string().max(80).optional(),
  downPayment:       z.number().nonnegative().optional(),
  installments:      z.number().int().positive().optional(),
  installmentAmount: z.number().positive().optional(),
  notes:             z.string().max(500).optional(),
})

const createSchema = z.object({
  clientId:       z.string().min(1),
  kommoLeadId:    z.string().optional(),
  customerName:   z.string().min(1).max(150),
  customerPhone:  z.string().max(30).optional(),
  customerEmail:  z.string().email().max(150).optional(),
  customerDni:    z.string().max(20).optional(),
  sale: z.object({
    make:     z.string().min(1).max(50),
    model:    z.string().min(1).max(80),
    version:  z.string().max(80).optional(),
    year:     z.number().int(),
    km:       z.number().int().nonnegative().optional(),
    price:    z.number().positive(),
    currency: z.string().max(5).default('ARS'),
  }),
  tradeIn:        tradeInSchema.optional(),
  paymentMethod:  z.enum(PAYMENT_METHODS),
  financing:      financingSchema.optional(),
  totalAmount:    z.number().positive(),
  createdByEmail: z.string().email().optional(),
}).refine(
  data => !['permuta', 'mixto'].includes(data.paymentMethod) || data.tradeIn,
  { message: 'Falta el vehículo en permuta para esta forma de pago', path: ['tradeIn'] },
).refine(
  data => !['financiado', 'mixto'].includes(data.paymentMethod) || data.financing,
  { message: 'Faltan los datos de financiación para esta forma de pago', path: ['financing'] },
)

function publicUrl(token: string): string {
  const base = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  return `${base}/q/${token}`
}

export async function quoteRoutes(app: FastifyInstance) {
  // GET /api/quotes/prefill?clientId=X&leadId=Y — datos de contacto para precargar el formulario
  app.get('/api/quotes/prefill', async (request, reply) => {
    const { clientId, leadId } = request.query as Record<string, string>
    if (!clientId || !leadId) {
      return reply.status(400).send({ error: 'Faltan parámetros' })
    }
    try {
      const contact = await fetchLeadContact(leadId, clientId)
      return contact
    } catch (err) {
      if (err instanceof KommoApiError) {
        return reply.status(err.status).send({ error: err.message })
      }
      app.log.error(err, '[quotes] Error en prefill')
      return reply.status(500).send({ error: 'Error interno del servidor' })
    }
  })

  // POST /api/quotes — crea el presupuesto y, si viene de un lead, deja la nota en Kommo
  app.post('/api/quotes', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parámetros inválidos', details: parsed.error.issues })
    }
    const data = parsed.data
    const token = randomBytes(24).toString('base64url')

    let quote = await prisma.quote.create({
      data: {
        clientId:                data.clientId,
        publicToken:              token,
        status:                   'draft',
        kommoLeadId:              data.kommoLeadId ?? null,
        kommoNoteStatus:          data.kommoLeadId ? null : 'skipped',
        customerName:             data.customerName,
        customerPhone:            data.customerPhone ?? null,
        customerEmail:            data.customerEmail ?? null,
        customerDni:              data.customerDni ?? null,
        saleMake:                 data.sale.make,
        saleModel:                data.sale.model,
        saleVersion:              data.sale.version ?? null,
        saleYear:                 data.sale.year,
        saleKm:                   data.sale.km ?? null,
        salePrice:                data.sale.price,
        saleCurrency:             data.sale.currency,
        tradeInMake:              data.tradeIn?.make ?? null,
        tradeInModel:             data.tradeIn?.model ?? null,
        tradeInYear:              data.tradeIn?.year ?? null,
        tradeInKm:                data.tradeIn?.km ?? null,
        tradeInValue:             data.tradeIn?.value ?? null,
        paymentMethod:            data.paymentMethod,
        financingEntity:          data.financing?.entity ?? null,
        financingDownPayment:     data.financing?.downPayment ?? null,
        financingInstallments:    data.financing?.installments ?? null,
        financingInstallmentAmt:  data.financing?.installmentAmount ?? null,
        financingNotes:           data.financing?.notes ?? null,
        totalAmount:              data.totalAmount,
        createdByEmail:           data.createdByEmail ?? null,
      },
    })

    if (data.kommoLeadId) {
      try {
        await addLeadNote(data.kommoLeadId, `Nuevo presupuesto: ${publicUrl(token)}`, data.clientId)
        quote = await prisma.quote.update({
          where: { id: quote.id },
          data:  { status: 'sent', kommoNoteStatus: 'sent', sentAt: new Date() },
        })
      } catch (err) {
        app.log.error(err, `[quotes] Error al notificar a Kommo el presupuesto ${quote.id}`)
        quote = await prisma.quote.update({
          where: { id: quote.id },
          data:  { kommoNoteStatus: 'failed' },
        })
      }

      // Campo personalizado "Link presupuesto" — best effort, no bloquea la creación
      // ni pisa el resultado de la nota si falla.
      try {
        await setQuoteLinkField(data.kommoLeadId, publicUrl(token), data.clientId)
      } catch (err) {
        app.log.error(err, `[quotes] Error al actualizar el campo de presupuesto en Kommo (presupuesto ${quote.id})`)
      }
    }

    return reply.status(201).send({ ok: true, quote, publicUrl: publicUrl(token) })
  })

  // GET /api/quotes?clientId=X — listado interno
  app.get('/api/quotes', async (request, reply) => {
    const { clientId, limit } = request.query as Record<string, string>
    if (!clientId) {
      return reply.status(400).send({ error: 'Faltan parámetros' })
    }
    const quotes = await prisma.quote.findMany({
      where:   { clientId },
      orderBy: { createdAt: 'desc' },
      take:    limit ? Number(limit) : 50,
    })
    return { data: quotes }
  })

  // GET /api/quotes/:id?clientId=X — detalle interno (siempre filtrado por clientId)
  app.get('/api/quotes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clientId } = request.query as Record<string, string>
    if (!clientId) {
      return reply.status(400).send({ error: 'Faltan parámetros' })
    }
    const quote = await prisma.quote.findFirst({ where: { id: Number(id), clientId } })
    if (!quote) {
      return reply.status(404).send({ error: 'Presupuesto no encontrado' })
    }
    return { data: quote, publicUrl: publicUrl(quote.publicToken) }
  })

  // GET /api/quotes/:id/pdf?clientId=X — descarga interna
  app.get('/api/quotes/:id/pdf', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { clientId } = request.query as Record<string, string>
    if (!clientId) {
      return reply.status(400).send({ error: 'Faltan parámetros' })
    }
    const quote = await prisma.quote.findFirst({ where: { id: Number(id), clientId } })
    if (!quote) {
      return reply.status(404).send({ error: 'Presupuesto no encontrado' })
    }
    const pdf = await buildQuotePdf(quote)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="presupuesto-${quote.id}.pdf"`)
    return reply.send(pdf)
  })

  // --- Rutas públicas, sin autenticación — namespace separado a propósito ---

  // GET /api/public/quotes/:token — vista del presupuesto para el cliente final
  app.get('/api/public/quotes/:token', async (request, reply) => {
    const { token } = request.params as { token: string }
    const quote = await prisma.quote.findUnique({ where: { publicToken: token } })
    if (!quote) {
      return reply.status(404).send({ error: 'Presupuesto no encontrado' })
    }
    const { createdByEmail, kommoLeadId, kommoNoteStatus, ...publicQuote } = quote
    return { data: publicQuote }
  })

  // GET /api/public/quotes/:token/pdf — descarga pública del PDF
  app.get('/api/public/quotes/:token/pdf', async (request, reply) => {
    const { token } = request.params as { token: string }
    const quote = await prisma.quote.findUnique({ where: { publicToken: token } })
    if (!quote) {
      return reply.status(404).send({ error: 'Presupuesto no encontrado' })
    }
    const pdf = await buildQuotePdf(quote)
    reply.header('Content-Type', 'application/pdf')
    reply.header('Content-Disposition', `attachment; filename="presupuesto-${quote.saleMake}-${quote.saleModel}.pdf"`)
    return reply.send(pdf)
  })
}
