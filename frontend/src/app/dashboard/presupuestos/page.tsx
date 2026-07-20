import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PresupuestosList } from '@/components/presupuestos/PresupuestosList'

export const dynamic = 'force-dynamic'

export default async function PresupuestosPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role            = (session.user as any)?.role as string | undefined
  const isAdmin         = role !== 'client'
  const sessionClientId = (session.user as any)?.clientId as string | null ?? null

  return <PresupuestosList isAdmin={isAdmin} sessionClientId={sessionClientId} />
}
