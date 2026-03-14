'use client'

import { useRouter } from 'next/navigation'

const CATEGORY_LABEL: Record<string, string> = {
  ANNUAL: 'ลาประจำปี',
  EVENT:  'ลาพิเศษ',
}
const CATEGORY_BADGE: Record<string, string> = {
  ANNUAL: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  EVENT:  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700',
}

interface Props {
  id: string
  leaveCategory: string
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
  leaveCategory,
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
      <td className="px-5 py-4 text-center whitespace-nowrap">
        <div className="flex flex-col items-center gap-1">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[leaveCategory] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {CATEGORY_LABEL[leaveCategory] ?? leaveCategory}
          </span>
          <span className="font-medium text-foreground">{leaveTypeName}</span>
        </div>
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
