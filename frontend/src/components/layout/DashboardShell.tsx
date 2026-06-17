'use client'
import { Sidebar } from './Sidebar'

interface Props {
  children: React.ReactNode
}

export function DashboardShell({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
