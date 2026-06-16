'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { getClientLogo } from '@/lib/clientLogos'
import type { Client } from '@/types/metrics'

interface Props {
  clients: Client[]
}

export function Sidebar({ clients }: Props) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop: sidebar vertical fija */}
      <aside className="hidden lg:flex flex-col w-56 min-h-screen border-r border-border bg-sidebar shrink-0">
        <div className="px-4 py-5">
          <p className="font-semibold text-sm text-sidebar-foreground">Dashboard IRM</p>
          <p className="text-xs text-muted-foreground mt-0.5">Marketing digital</p>
        </div>

        <Separator />

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Clientes</p>
          {clients.map(client => {
            const logo = getClientLogo(client.id)
            return (
              <Link
                key={client.id}
                href={`/dashboard/${client.id}`}
                className={cn(
                  'flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors',
                  pathname === `/dashboard/${client.id}`
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                )}
              >
                {logo ? (
                  <Image src={logo} alt={client.name} width={80} height={20} className="h-5 w-auto object-contain" />
                ) : (
                  client.name
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile: barra horizontal en la parte superior */}
      <header className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-border bg-sidebar overflow-x-auto shrink-0">
        <p className="text-xs font-medium text-muted-foreground whitespace-nowrap mr-2">Cliente:</p>
        {clients.map(client => (
          <Link
            key={client.id}
            href={`/dashboard/${client.id}`}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
              pathname === `/dashboard/${client.id}`
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            )}
          >
            {client.name}
          </Link>
        ))}
      </header>
    </>
  )
}
