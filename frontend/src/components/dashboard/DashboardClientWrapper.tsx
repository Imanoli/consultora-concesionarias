'use client'
import dynamic from 'next/dynamic'

const DashboardView = dynamic(
  () => import('./DashboardView').then(m => m.DashboardView),
  { ssr: false }
)

interface Props {
  clientId:            string
  clientName:          string
  metaFondosUsd:       number | null
  metaFondosUpdatedAt: string | null
}

export function DashboardClientWrapper(props: Props) {
  return <DashboardView {...props} />
}
