import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardClientWrapper } from '@/components/dashboard/DashboardClientWrapper'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const isAdmin        = (session.user as any).role === 'admin'
  const sessionClientId = (session.user as any).clientId as string | null

  return <DashboardClientWrapper isAdmin={isAdmin} sessionClientId={sessionClientId} />
}
