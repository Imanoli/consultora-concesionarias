'use client'
import { Sidebar } from './Sidebar'
import type { Client } from '@/types/metrics'

interface Props {
  clients:  Client[]
  children: React.ReactNode
}

export function DashboardShell({ clients, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar clients={clients} />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
