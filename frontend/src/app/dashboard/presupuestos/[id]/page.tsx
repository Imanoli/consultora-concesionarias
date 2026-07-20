import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QuoteDetail } from '@/components/presupuestos/QuoteDetail'

export const dynamic = 'force-dynamic'

export default async function PresupuestoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id }           = await params
  const role              = (session.user as any)?.role as string | undefined
  const isAdmin           = role !== 'client'
  const sessionClientId   = (session.user as any)?.clientId as string | null ?? null

  return <QuoteDetail id={Number(id)} isAdmin={isAdmin} sessionClientId={sessionClientId} />
}
