import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { Quote } from '@prisma/client'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#171a17' },
  header: { marginBottom: 24, borderBottom: 1, borderBottomColor: '#dcdfd6', paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: '#656b62' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: '#c4571f' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  label: { color: '#656b62' },
  value: { fontWeight: 700 },
  total: { marginTop: 12, paddingTop: 12, borderTop: 1, borderTopColor: '#dcdfd6', flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13, fontWeight: 700 },
  totalValue: { fontSize: 16, fontWeight: 700, color: '#c4571f' },
  footer: { marginTop: 32, fontSize: 9, color: '#9aa099' },
})

function money(value: unknown, currency = 'ARS'): string {
  const n = Number(value ?? 0)
  return `${currency} ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  financiado: 'Financiado',
  permuta: 'Permuta',
  mixto: 'Mixto (permuta + financiación)',
}

function QuoteDocument({ quote }: { quote: Quote }) {
  const hasTradeIn = Boolean(quote.tradeInMake)
  const hasFinancing = quote.paymentMethod === 'financiado' || quote.paymentMethod === 'mixto'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Dakota Cars</Text>
          <Text style={styles.subtitle}>
            Presupuesto Nº {quote.id} · {new Date(quote.createdAt).toLocaleDateString('es-AR')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}><Text style={styles.label}>Nombre</Text><Text style={styles.value}>{quote.customerName}</Text></View>
          {quote.customerDni && <View style={styles.row}><Text style={styles.label}>DNI/CUIT</Text><Text style={styles.value}>{quote.customerDni}</Text></View>}
          {quote.customerPhone && <View style={styles.row}><Text style={styles.label}>Teléfono</Text><Text style={styles.value}>{quote.customerPhone}</Text></View>}
          {quote.customerEmail && <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{quote.customerEmail}</Text></View>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehículo a vender</Text>
          <View style={styles.row}><Text style={styles.label}>Vehículo</Text><Text style={styles.value}>{quote.saleMake} {quote.saleModel} {quote.saleVersion ?? ''} ({quote.saleYear})</Text></View>
          {quote.saleKm != null && <View style={styles.row}><Text style={styles.label}>Kilometraje</Text><Text style={styles.value}>{quote.saleKm.toLocaleString('es-AR')} km</Text></View>}
          <View style={styles.row}><Text style={styles.label}>Precio</Text><Text style={styles.value}>{money(quote.salePrice, quote.saleCurrency)}</Text></View>
        </View>

        {hasTradeIn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehículo en permuta</Text>
            <View style={styles.row}><Text style={styles.label}>Vehículo</Text><Text style={styles.value}>{quote.tradeInMake} {quote.tradeInModel} ({quote.tradeInYear})</Text></View>
            {quote.tradeInKm != null && <View style={styles.row}><Text style={styles.label}>Kilometraje</Text><Text style={styles.value}>{quote.tradeInKm.toLocaleString('es-AR')} km</Text></View>}
            <View style={styles.row}><Text style={styles.label}>Valor de toma</Text><Text style={styles.value}>{money(quote.tradeInValue, quote.saleCurrency)}</Text></View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forma de pago</Text>
          <View style={styles.row}><Text style={styles.label}>Modalidad</Text><Text style={styles.value}>{PAYMENT_LABELS[quote.paymentMethod] ?? quote.paymentMethod}</Text></View>
          {hasFinancing && (
            <>
              {quote.financingEntity && <View style={styles.row}><Text style={styles.label}>Entidad</Text><Text style={styles.value}>{quote.financingEntity}</Text></View>}
              {quote.financingDownPayment != null && <View style={styles.row}><Text style={styles.label}>Anticipo</Text><Text style={styles.value}>{money(quote.financingDownPayment, quote.saleCurrency)}</Text></View>}
              {quote.financingInstallments != null && quote.financingInstallmentAmt != null && (
                <View style={styles.row}>
                  <Text style={styles.label}>Cuotas</Text>
                  <Text style={styles.value}>{quote.financingInstallments} x {money(quote.financingInstallmentAmt, quote.saleCurrency)}</Text>
                </View>
              )}
              {quote.financingNotes && <View style={styles.row}><Text style={styles.label}>Notas</Text><Text style={styles.value}>{quote.financingNotes}</Text></View>}
            </>
          )}
        </View>

        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{money(quote.totalAmount, quote.saleCurrency)}</Text>
        </View>

        <Text style={styles.footer}>
          Presupuesto sujeto a disponibilidad de stock y confirmación final. Validez: 7 días desde la fecha de emisión.
        </Text>
      </Page>
    </Document>
  )
}

export async function buildQuotePdf(quote: Quote): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument quote={quote} />)
}
