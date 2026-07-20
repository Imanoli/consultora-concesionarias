import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QuoteForm } from '@/components/presupuestos/QuoteForm'

export const dynamic = 'force-dynamic'

export default async function NuevoPresupuestoPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role            = (session.user as any)?.role as string | undefined
  const isAdmin         = role !== 'client'
  const sessionClientId = (session.user as any)?.clientId as string | null ?? null
  const createdByEmail  = session.user.email ?? undefined

  return <QuoteForm isAdmin={isAdmin} sessionClientId={sessionClientId} createdByEmail={createdByEmail} />
}
