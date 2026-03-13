'use client'

import { useRouter } from 'next/navigation'

interface Props {
  id: string
  leaveTypeName: string
  startDate: string
  endDate: string
  totalDays: string
  statusBadge: string
  statusLabel: string
  status: string
  createdAt: string
  hideCreatedAt?: boolean
  hideTotalDays?: boolean
}

export default function LeaveTableRow({
  id,
  leaveTypeName,
  startDate,
  endDate,
  totalDays,
  statusBadge,
  statusLabel,
  status,
  createdAt,
  hideCreatedAt,
  hideTotalDays,
}: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/leave-request/${id}/edit`)}
      className="hover:bg-primary/3 dark:hover:bg-primary/10 transition cursor-pointer"
    >
      <td className="px-5 py-4 text-center font-medium text-foreground whitespace-nowrap">
        {leaveTypeName}
      </td>
      <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
        {startDate}
      </td>
      <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
        {endDate}
      </td>
      {!hideTotalDays && (
        <td className="px-5 py-4 text-center font-semibold text-foreground">
          {totalDays}
        </td>
      )}
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge}`}>
          {statusLabel}
        </span>
      </td>
      {!hideCreatedAt && (
        <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
          {createdAt}
        </td>
      )}
    </tr>
  )
}
