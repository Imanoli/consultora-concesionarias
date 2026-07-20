'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { clientHasPresupuestador } from '@/lib/clientFeatures'

interface Props {
  isAdmin:         boolean
  sessionClientId: string | null
}

function SidebarNav({ isAdmin, sessionClientId }: Props) {
  const searchParams   = useSearchParams()
  const activeClientId = isAdmin ? searchParams.get('client') : sessionClientId

  const showPresupuestador = Boolean(activeClientId && clientHasPresupuestador(activeClientId))

  if (!showPresupuestador) return null

  return (
    <nav className="px-2 py-3 space-y-0.5">
      <Link
        href={`/dashboard/presupuestos${activeClientId ? `?client=${activeClientId}` : ''}`}
        className="block rounded-lg px-2.5 py-1.5 text-sm text-sidebar-foreground hover:bg-white/5 transition-colors"
      >
        Presupuestador
      </Link>
    </nav>
  )
}

export function Sidebar({ isAdmin, sessionClientId }: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-48 min-h-screen border-r border-white/8 bg-sidebar shrink-0">
      <div className="px-4 py-5">
        <p className="font-semibold text-sm text-sidebar-foreground tracking-tight">Dashboard IRM</p>
        <p className="text-xs text-muted-foreground mt-0.5">Marketing digital</p>
      </div>
      <Separator />
      <Suspense fallback={null}>
        <SidebarNav isAdmin={isAdmin} sessionClientId={sessionClientId} />
      </Suspense>
    </aside>
  )
}
