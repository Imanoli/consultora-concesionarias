import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import type { CampaignData } from '@/types/metrics'

interface Props {
  data:              CampaignData[]
  currencyFormatter?: (v: number) => string
}

export function CampaignsTable({ data, currencyFormatter = formatCurrency }: Props) {
  const top10 = data.slice(0, 10)

  if (top10.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin datos de campañas</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaña</TableHead>
            <TableHead className="text-right">Inversión</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">CPM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top10.map(c => (
            <TableRow key={c.campaignId}>
              <TableCell className="font-medium text-sm max-w-[200px] truncate">
                {c.campaignName}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {currencyFormatter(c.spend)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatNumber(c.leads)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {c.cpl ? currencyFormatter(c.cpl) : '—'}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatPercent(c.ctr)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {c.cpm ? currencyFormatter(c.cpm) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
