'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getQuote } from '@/lib/api'
import { formatCurrencyARS, formatDate } from '@/lib/utils'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/backend'

interface Props {
  id:              number
  isAdmin:         boolean
  sessionClientId: string | null
}

const KOMMO_NOTE_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  sent:    { label: 'Nota agregada en Kommo',  variant: 'default' },
  failed:  { label: 'No se pudo notificar a Kommo', variant: 'destructive' },
  skipped: { label: 'Sin lead de Kommo asociado', variant: 'secondary' },
}

function Detail({ id, isAdmin, sessionClientId }: Props) {
  const [copied, setCopied] = useState(false)
  const searchParams   = useSearchParams()
  const activeClientId = isAdmin ? searchParams.get('client') : sessionClientId

  const { data, error, isLoading } = useSWR(
    activeClientId ? `quote-${id}-${activeClientId}` : null,
    () => getQuote(id, activeClientId as string),
  )

  if (!activeClientId) return <div className="flex items-center justify-center h-64 text-sm text-red-500">Falta el cliente en la URL.</div>
  if (isLoading) return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Cargando...</div>
  if (error || !data) return <div className="flex items-center justify-center h-64 text-sm text-red-500">No se pudo cargar el presupuesto.</div>

  const { data: quote, publicUrl } = data
  const kommoStatus = quote.kommoNoteStatus ? KOMMO_NOTE_LABEL[quote.kommoNoteStatus] : null

  function handleCopy() {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Presupuesto #{quote.id}</h1>
        {kommoStatus && <Badge variant={kommoStatus.variant}>{kommoStatus.label}</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{quote.customerName}</p>
          {quote.customerPhone && <p className="text-muted-foreground">{quote.customerPhone}</p>}
          {quote.customerEmail && <p className="text-muted-foreground">{quote.customerEmail}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Vehículo</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{quote.saleMake} {quote.saleModel} {quote.saleVersion ?? ''} ({quote.saleYear})</p>
          <p className="text-muted-foreground">{formatCurrencyARS(Number(quote.salePrice))}</p>
        </CardContent>
      </Card>

      {quote.tradeInMake && (
        <Card>
          <CardHeader><CardTitle>Permuta</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{quote.tradeInMake} {quote.tradeInModel} ({quote.tradeInYear})</p>
            <p className="text-muted-foreground">Valor de toma: {formatCurrencyARS(Number(quote.tradeInValue))}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Total</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{formatCurrencyARS(Number(quote.totalAmount))}</p>
          <p className="text-xs text-muted-foreground mt-1">Creado el {formatDate(quote.createdAt.slice(0, 10))}</p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCopy}>{copied ? 'Copiado' : 'Copiar link público'}</Button>
        <Button asChild>
          <a href={`${BASE}/api/quotes/${quote.id}/pdf?clientId=${quote.clientId}`} target="_blank" rel="noopener noreferrer">
            Descargar PDF
          </a>
        </Button>
      </div>
    </div>
  )
}

export function QuoteDetail(props: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Cargando...</div>
    }>
      <Detail {...props} />
    </Suspense>
  )
}
