'use client'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import dynamic from 'next/dynamic'
import { getClients } from '@/lib/api'

const DashboardView = dynamic(
  () => import('./DashboardView').then(m => m.DashboardView),
  { ssr: false }
)

function ClientDashboard() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { data: clients = [], isLoading } = useSWR('clients', getClients)

  const paramId     = searchParams.get('client')
  const activeClient = (paramId && clients.find(c => c.id === paramId)) || clients[0] || null

  function handleClientChange(newId: string) {
    router.replace(`/dashboard?client=${newId}`, { scroll: false })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Cargando...
      </div>
    )
  }

  if (!activeClient) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Sin clientes disponibles
      </div>
    )
  }

  return (
    <DashboardView
      clientId={activeClient.id}
      clientName={activeClient.name}
      clients={clients}
      onClientChange={handleClientChange}
      metaFondosUsd={activeClient.metaFondosUsd ?? null}
      googleAdsCustomerId={activeClient.googleAdsCustomerId ?? null}
      googleAdsFondosArs={activeClient.googleAdsFondosArs ?? null}
      googleAdsFondosUpdatedAt={activeClient.googleAdsFondosUpdatedAt ?? null}
    />
  )
}

export function DashboardClientWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Cargando...
      </div>
    }>
      <ClientDashboard />
    </Suspense>
  )
}
