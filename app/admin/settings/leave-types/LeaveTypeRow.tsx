'use client'

import { useRouter } from 'next/navigation'

type Props = {
  id: string
  name: string
  maxDaysPerYear: number | null
  maxDaysPerRequest: number | null
  requiresAttachment: boolean
  deductFromBalance: boolean
  allowDuringProbation: boolean
}

function BoolBadge({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return value ? (
    <span className="inline-block bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
      {yes}
    </span>
  ) : (
    <span className="inline-block bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full border border-border">
      {no}
    </span>
  )
}

export default function LeaveTypeRow({
  id,
  name,
  maxDaysPerYear,
  maxDaysPerRequest,
  requiresAttachment,
  deductFromBalance,
  allowDuringProbation,
}: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/admin/settings/leave-types/${id}`)}
      className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors cursor-pointer"
    >
      <td className="px-5 py-4 font-medium text-foreground">{name}</td>
      <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
        {maxDaysPerYear ?? <span className="text-muted-foreground/40">—</span>}
      </td>
      <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
        {maxDaysPerRequest ?? <span className="text-muted-foreground/40">—</span>}
      </td>
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <BoolBadge value={requiresAttachment} yes="ต้องการ" no="ไม่ต้องการ" />
      </td>
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <BoolBadge value={deductFromBalance} yes="หัก" no="ไม่หัก" />
      </td>
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <BoolBadge value={allowDuringProbation} yes="อนุญาต" no="ไม่อนุญาต" />
      </td>
    </tr>
  )
}
