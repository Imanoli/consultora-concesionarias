import { getClients } from '@/lib/api'
import { DashboardClientWrapper } from '@/components/dashboard/DashboardClientWrapper'
import type { Client } from '@/types/metrics'

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { clientId } = await params
  const clients      = await getClients().catch(() => [] as Client[])
  const client       = clients.find(c => c.id === clientId)
  const clientName   = client?.name ?? clientId

  return (
    <DashboardClientWrapper
      clientId={clientId}
      clientName={clientName}
      metaFondosUsd={client?.metaFondosUsd ?? null}
      metaFondosUpdatedAt={client?.metaFondosUpdatedAt ?? null}
    />
  )
}

export const dynamic = 'force-dynamic'
