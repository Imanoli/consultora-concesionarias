'use client'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-48 min-h-screen border-r border-white/8 bg-sidebar shrink-0">
      <div className="px-4 py-5">
        <p className="font-semibold text-sm text-sidebar-foreground tracking-tight">Dashboard IRM</p>
        <p className="text-xs text-muted-foreground mt-0.5">Marketing digital</p>
      </div>
      <Separator />
    </aside>
  )
}
