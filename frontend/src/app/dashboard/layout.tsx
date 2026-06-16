import { getClients } from '@/lib/api'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Client } from '@/types/metrics'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const clients = await getClients().catch(() => [] as Client[])

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar clients={clients} />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
