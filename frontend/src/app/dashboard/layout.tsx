import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role            = (session.user as any)?.role as string | undefined
  const isAdmin         = role !== 'client'
  const sessionClientId = (session.user as any)?.clientId as string | null ?? null

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar isAdmin={isAdmin} sessionClientId={sessionClientId} />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
