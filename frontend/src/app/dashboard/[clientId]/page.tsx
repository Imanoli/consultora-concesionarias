import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function DashboardClientRedirect({ params }: Props) {
  const { clientId } = await params
  redirect(`/dashboard?client=${clientId}`)
}
