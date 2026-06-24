'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getRevenue, saveRevenue, getMetrics } from '@/lib/api'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function monthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2,'0')}-01`
  const last  = new Date(year, month, 0).getDate()
  const to   = `${year}-${String(month).padStart(2,'0')}-${String(last).padStart(2,'0')}`
  return { from, to }
}

interface Props {
  clientId:            string
  googleAdsCustomerId: string | null
  isAdmin:             boolean
}

export function RoasSection({ clientId, googleAdsCustomerId, isAdmin }: Props) {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [modal, setModal] = useState(false)

  const { from, to } = monthRange(year, month)
  const revenueKey = ['revenue', clientId, year, month]

  const { data: revenue, mutate: mutateRevenue } = useSWR(
    revenueKey,
    () => getRevenue({ clientId, year, month })
  )
  const { data: metaMetrics }   = useSWR(
    ['roas-meta',  clientId, from, to],
    () => getMetrics({ clientId, source: 'meta',       from, to })
  )
  const { data: gadsMetrics }   = useSWR(
    googleAdsCustomerId ? ['roas-gads', clientId, from, to] : null,
    () => getMetrics({ clientId, source: 'google_ads', from, to })
  )

  const amountArs  = revenue?.amountArs  ?? null
  const usdArsRate = revenue?.usdArsRate ?? null
  const metaSpendUsd  = metaMetrics?.current.spend  ?? 0
  const gadsSpendArs  = gadsMetrics?.current.spend  ?? 0
  const totalSpendArs = usdArsRate
    ? metaSpendUsd * usdArsRate + gadsSpendArs
    : gadsSpendArs

  const roas = amountArs && totalSpendArs > 0
    ? amountArs / totalSpendArs
    : null

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          ROAS
        </h2>
        <div className="flex-1 border-t border-border" />
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="text-muted-foreground hover:text-foreground text-sm px-1">‹</button>
              <CardTitle className="text-sm font-medium">
                {MONTHS[month - 1]} {year}
              </CardTitle>
              <button
                onClick={nextMonth}
                disabled={year === now.getFullYear() && month === now.getMonth() + 1}
                className="text-muted-foreground hover:text-foreground text-sm px-1 disabled:opacity-30"
              >›</button>
            </div>
            {isAdmin && (
              <button
                onClick={() => setModal(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {amountArs ? 'Editar facturación' : '+ Ingresar facturación'}
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Facturación" value={amountArs ? `$${amountArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—'} />
            <Stat label="Inversión total" value={totalSpendArs > 0 ? `$${totalSpendArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—'} />
            <Stat label="ROAS" value={roas ? `${roas.toFixed(2)}x` : '—'} highlight={roas !== null} />
            <Stat label="TC USD/ARS" value={usdArsRate ? `$${usdArsRate.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '—'} />
          </div>
          {amountArs === null && (
            <p className="mt-3 text-xs text-muted-foreground">
              {isAdmin ? 'Ingresá la facturación del mes para ver el ROAS.' : 'Sin datos de facturación para este mes.'}
            </p>
          )}
        </CardContent>
      </Card>

      {modal && (
        <RevenueModal
          clientId={clientId}
          year={year}
          month={month}
          initial={revenue ?? null}
          onClose={() => setModal(false)}
          onSaved={() => { mutateRevenue(); setModal(false) }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-emerald-400' : ''}`}>{value}</p>
    </div>
  )
}

interface ModalProps {
  clientId: string
  year:     number
  month:    number
  initial:  { amountArs: number | null; usdArsRate: number | null; notes: string | null } | null
  onClose:  () => void
  onSaved:  () => void
}

function RevenueModal({ clientId, year, month, initial, onClose, onSaved }: ModalProps) {
  const [amount,   setAmount]   = useState(initial?.amountArs  ? String(initial.amountArs)  : '')
  const [rate,     setRate]     = useState(initial?.usdArsRate ? String(initial.usdArsRate) : '')
  const [notes,    setNotes]    = useState(initial?.notes ?? '')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSave() {
    const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'))
    const rateNum   = parseFloat(rate.replace(/\./g, '').replace(',', '.'))
    if (!amountNum || amountNum <= 0) { setError('Ingresá un monto válido'); return }
    if (!rateNum   || rateNum   <= 0) { setError('Ingresá un tipo de cambio válido'); return }
    setLoading(true)
    setError('')
    try {
      await saveRevenue({ clientId, year, month, amountArs: amountNum, usdArsRate: rateNum, notes: notes || undefined })
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-background border border-border rounded-xl p-6 w-full max-w-sm space-y-4 shadow-lg">
        <h3 className="font-semibold text-sm">
          Facturación — {MONTHS[month - 1]} {year}
        </h3>

        <div className="space-y-3">
          <Field label="Facturación ARS" value={amount} onChange={setAmount} placeholder="Ej: 5000000" />
          <Field label="Tipo de cambio USD/ARS" value={rate} onChange={setRate} placeholder="Ej: 1250" />
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Notas (opcional)</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: incluye ventas de showroom"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
