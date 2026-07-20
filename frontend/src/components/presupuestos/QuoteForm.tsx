'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { createQuote, prefillFromLead } from '@/lib/api'
import { clientHasPresupuestador } from '@/lib/clientFeatures'
import type { CreateQuotePayload, PaymentMethod } from '@/types/quotes'

interface Props {
  isAdmin:         boolean
  sessionClientId: string | null
  createdByEmail?: string
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo',   label: 'Efectivo' },
  { value: 'financiado', label: 'Financiado' },
  { value: 'permuta',    label: 'Permuta' },
  { value: 'mixto',      label: 'Mixto (permuta + financiación)' },
]

function Form({ isAdmin, sessionClientId, createdByEmail }: Props) {
  const router          = useRouter()
  const searchParams    = useSearchParams()
  const activeClientId  = isAdmin ? searchParams.get('client') : sessionClientId
  const leadIdParam     = searchParams.get('leadId')

  const [kommoLeadId, setKommoLeadId]     = useState(leadIdParam ?? '')
  const [customerName, setCustomerName]   = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerDni, setCustomerDni]     = useState('')

  const [saleMake, setSaleMake]       = useState('')
  const [saleModel, setSaleModel]     = useState('')
  const [saleVersion, setSaleVersion] = useState('')
  const [saleYear, setSaleYear]       = useState('')
  const [saleKm, setSaleKm]           = useState('')
  const [salePrice, setSalePrice]     = useState('')

  const [hasTradeIn, setHasTradeIn]     = useState(false)
  const [tradeInMake, setTradeInMake]   = useState('')
  const [tradeInModel, setTradeInModel] = useState('')
  const [tradeInYear, setTradeInYear]   = useState('')
  const [tradeInKm, setTradeInKm]       = useState('')
  const [tradeInValue, setTradeInValue] = useState('')

  const [paymentMethod, setPaymentMethod]           = useState<PaymentMethod>('efectivo')
  const [financingEntity, setFinancingEntity]       = useState('')
  const [downPayment, setDownPayment]               = useState('')
  const [installments, setInstallments]             = useState('')
  const [installmentAmount, setInstallmentAmount]   = useState('')
  const [financingNotes, setFinancingNotes]         = useState('')

  const [totalAmount, setTotalAmount] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [prefillLoading, setPrefillLoading] = useState(false)

  const needsTradeIn  = paymentMethod === 'permuta' || paymentMethod === 'mixto'
  const needsFinancing = paymentMethod === 'financiado' || paymentMethod === 'mixto'

  useEffect(() => {
    if (!leadIdParam || !activeClientId) return
    setPrefillLoading(true)
    prefillFromLead(activeClientId, leadIdParam)
      .then(data => {
        if (data.name)  setCustomerName(data.name)
        if (data.email) setCustomerEmail(data.email)
        if (data.phone) setCustomerPhone(data.phone)
      })
      .catch(() => { /* si falla el prefill, el vendedor completa a mano */ })
      .finally(() => setPrefillLoading(false))
  }, [leadIdParam, activeClientId])

  if (!activeClientId || !clientHasPresupuestador(activeClientId)) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Presupuestador no disponible para este cliente.
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (needsTradeIn && (!tradeInMake || !tradeInModel || !tradeInYear || !tradeInValue)) {
      setError('Completá los datos del vehículo en permuta.')
      return
    }
    if (needsFinancing && (!installments || !installmentAmount)) {
      setError('Completá los datos de financiación.')
      return
    }
    if (!totalAmount) {
      setError('Falta el monto total.')
      return
    }

    setLoading(true)
    try {
      const payload: CreateQuotePayload = {
        clientId: activeClientId as string,
        kommoLeadId: kommoLeadId || undefined,
        customerName,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        customerDni: customerDni || undefined,
        sale: {
          make: saleMake, model: saleModel,
          version: saleVersion || undefined,
          year: Number(saleYear), km: saleKm ? Number(saleKm) : undefined,
          price: Number(salePrice), currency: 'ARS',
        },
        tradeIn: needsTradeIn ? {
          make: tradeInMake, model: tradeInModel, year: Number(tradeInYear),
          km: tradeInKm ? Number(tradeInKm) : undefined, value: Number(tradeInValue),
        } : undefined,
        paymentMethod,
        financing: needsFinancing ? {
          entity: financingEntity || undefined,
          downPayment: downPayment ? Number(downPayment) : undefined,
          installments: Number(installments),
          installmentAmount: Number(installmentAmount),
          notes: financingNotes || undefined,
        } : undefined,
        totalAmount: Number(totalAmount),
        createdByEmail,
      }
      const result = await createQuote(payload)
      router.push(`/dashboard/presupuestos/${result.quote.id}?client=${activeClientId}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold">Nuevo presupuesto</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Lead de Kommo (opcional)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>ID del lead</Label>
              <Input value={kommoLeadId} onChange={e => setKommoLeadId(e.target.value)} placeholder="Ej: 12971638" />
              {prefillLoading && <p className="text-xs text-muted-foreground">Buscando datos del lead...</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input required value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>DNI/CUIT</Label>
              <Input value={customerDni} onChange={e => setCustomerDni(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vehículo a vender</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marca *</Label>
                <Input required value={saleMake} onChange={e => setSaleMake(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo *</Label>
                <Input required value={saleModel} onChange={e => setSaleModel(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Versión</Label>
                <Input value={saleVersion} onChange={e => setSaleVersion(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Año *</Label>
                <Input required type="number" value={saleYear} onChange={e => setSaleYear(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Km</Label>
                <Input type="number" value={saleKm} onChange={e => setSaleKm(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Precio (ARS) *</Label>
              <Input required type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Forma de pago</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
              {PAYMENT_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-center gap-2">
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value} className="font-normal">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>

            {needsFinancing && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Entidad financiera</Label>
                    <Input value={financingEntity} onChange={e => setFinancingEntity(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Anticipo (ARS)</Label>
                    <Input type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cantidad de cuotas *</Label>
                    <Input required type="number" value={installments} onChange={e => setInstallments(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monto por cuota (ARS) *</Label>
                    <Input required type="number" value={installmentAmount} onChange={e => setInstallmentAmount(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notas de financiación</Label>
                  <Textarea value={financingNotes} onChange={e => setFinancingNotes(e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {needsTradeIn && (
          <Card>
            <CardHeader><CardTitle>Vehículo en permuta</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Marca *</Label>
                  <Input required value={tradeInMake} onChange={e => setTradeInMake(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Modelo *</Label>
                  <Input required value={tradeInModel} onChange={e => setTradeInModel(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Año *</Label>
                  <Input required type="number" value={tradeInYear} onChange={e => setTradeInYear(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Km</Label>
                  <Input type="number" value={tradeInKm} onChange={e => setTradeInKm(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor de toma *</Label>
                  <Input required type="number" value={tradeInValue} onChange={e => setTradeInValue(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Total</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>Monto total del presupuesto (ARS) *</Label>
              <Input required type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear presupuesto'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function QuoteForm(props: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Cargando...</div>
    }>
      <Form {...props} />
    </Suspense>
  )
}
