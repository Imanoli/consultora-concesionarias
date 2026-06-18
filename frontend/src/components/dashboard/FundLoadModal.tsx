'use client'
import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'

interface Props {
  open:     boolean
  clientId: string
  source:   'meta' | 'google_ads'
  currency: 'USD' | 'ARS'
  onClose:  () => void
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '/backend'

export function FundLoadModal({ open, clientId, source, currency, onClose }: Props) {
  const { mutate }            = useSWRConfig()
  const [amount, setAmount]   = useState('')
  const [date, setDate]       = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  if (!open) return null

  function handleClose() {
    setAmount(''); setNotes(''); setError(null)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${BASE}/api/fund-loads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId, source, currency,
          amount:   parseFloat(amount),
          loadedAt: date,
          notes:    notes || undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      await mutate('clients')
      handleClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const title = source === 'meta' ? 'Cargar saldo Meta Ads' : 'Cargar saldo Google Ads'
  const placeholder = currency === 'USD' ? '102.42' : '44000'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

      {/* Panel */}
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold mb-4">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Monto ({currency})</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de carga</Label>
            <Input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Notas{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: recarga mensual"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !amount}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
