import { notFound } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrencyARS, formatDate } from '@/lib/utils'
import type { Quote } from '@/types/quotes'

export const dynamic = 'force-dynamic'

const PAYMENT_LABELS: Record<string, string> = {
  efectivo:   'Efectivo',
  financiado: 'Financiado',
  permuta:    'Permuta',
  mixto:      'Mixto (permuta + financiación)',
}

async function fetchQuote(token: string): Promise<Quote | null> {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return null
  const res = await fetch(`${backendUrl}/api/public/quotes/${token}`, { cache: 'no-store' })
  if (!res.ok) return null
  const body = await res.json() as { data: Quote }
  return body.data
}

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const quote = await fetchQuote(token)
  if (!quote) notFound()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Presupuesto</h1>
        <p className="text-sm text-muted-foreground">Emitido el {formatDate(quote.createdAt.slice(0, 10))}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Vehículo</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{quote.saleMake} {quote.saleModel} {quote.saleVersion ?? ''} ({quote.saleYear})</p>
          {quote.saleKm != null && <p className="text-muted-foreground">{quote.saleKm.toLocaleString('es-AR')} km</p>}
          <p className="text-muted-foreground">{formatCurrencyARS(Number(quote.salePrice))}</p>
        </CardContent>
      </Card>

      {quote.tradeInMake && (
        <Card>
          <CardHeader><CardTitle>Vehículo en permuta</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{quote.tradeInMake} {quote.tradeInModel} ({quote.tradeInYear})</p>
            <p className="text-muted-foreground">Valor de toma: {formatCurrencyARS(Number(quote.tradeInValue))}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Forma de pago</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{PAYMENT_LABELS[quote.paymentMethod] ?? quote.paymentMethod}</p>
          {quote.financingInstallments != null && quote.financingInstallmentAmt != null && (
            <p className="text-muted-foreground">{quote.financingInstallments} cuotas de {formatCurrencyARS(Number(quote.financingInstallmentAmt))}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Total</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{formatCurrencyARS(Number(quote.totalAmount))}</p>
        </CardContent>
      </Card>

      <a
        href={`/backend/api/public/quotes/${token}/pdf`}
        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
      >
        Descargar PDF
      </a>

      <p className="text-xs text-muted-foreground pt-4">
        Presupuesto sujeto a disponibilidad de stock y confirmación final. Validez: 7 días desde la fecha de emisión.
      </p>
    </div>
  )
}
