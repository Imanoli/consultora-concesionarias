'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getQuotes } from '@/lib/api'
import { clientHasPresupuestador } from '@/lib/clientFeatures'
import { formatCurrencyARS, formatDate } from '@/lib/utils'

interface Props {
  isAdmin:         boolean
  sessionClientId: string | null
}

const STATUS_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  sent:  { label: 'Enviado',  variant: 'default' },
}

function List({ isAdmin, sessionClientId }: Props) {
  const searchParams   = useSearchParams()
  const activeClientId = isAdmin ? searchParams.get('client') : sessionClientId

  const { data: quotes = [], isLoading } = useSWR(
    activeClientId ? `quotes-${activeClientId}` : null,
    () => getQuotes(activeClientId as string),
  )

  if (!activeClientId || !clientHasPresupuestador(activeClientId)) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Presupuestador no disponible para este cliente.
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Presupuestos</h1>
        <Button asChild>
          <Link href={`/dashboard/presupuestos/nuevo?client=${activeClientId}`}>Nuevo presupuesto</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : quotes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay presupuestos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map(q => {
                  const status = STATUS_LABEL[q.status] ?? { label: q.status, variant: 'outline' as const }
                  return (
                    <TableRow key={q.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/dashboard/presupuestos/${q.id}?client=${activeClientId}`} className="hover:underline">
                          {q.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>{q.saleMake} {q.saleModel} ({q.saleYear})</TableCell>
                      <TableCell>{formatCurrencyARS(Number(q.totalAmount))}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell>{formatDate(q.createdAt.slice(0, 10))}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function PresupuestosList(props: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Cargando...</div>
    }>
      <List {...props} />
    </Suspense>
  )
}
