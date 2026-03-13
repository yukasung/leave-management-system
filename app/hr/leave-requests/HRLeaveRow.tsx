'use client'

import { useRouter } from 'next/navigation'
import { Paperclip } from 'lucide-react'
import { HRActionButtons } from './HRActionButtons'

const STATUS_BADGE_NEW: Record<string, string> = {
  PENDING:          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW:        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:         'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:         'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  CANCELLED:        'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
  CANCEL_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
}

const STATUS_DOT: Record<string, string> = {
  PENDING:          'bg-amber-500',
  IN_REVIEW:        'bg-blue-500',
  APPROVED:         'bg-emerald-500',
  REJECTED:         'bg-red-500',
  CANCELLED:        'bg-gray-400',
  CANCEL_REQUESTED: 'bg-orange-500',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'รอ HR',
  APPROVED:         'อนุมัติแล้ว',
  REJECTED:         'ปฏิเสธ',
  CANCELLED:        'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก',
}

interface Props {
  id: string
  rowNumber: number
  userName: string
  departmentName: string | null
  leaveTypeName: string
  startDate: string
  endDate: string
  totalDays: string
  createdAt: string
  status: string
  documentUrl: string | null
}

export default function HRLeaveRow({
  id, rowNumber, userName, departmentName, leaveTypeName,
  startDate, endDate, totalDays, createdAt, status, documentUrl,
}: Props) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/leave-request/${id}/edit`)}
      className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors cursor-pointer"
    >
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{rowNumber}</td>
      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{userName}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{leaveTypeName}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{startDate}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{endDate}</td>
      <td className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">{totalDays}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{createdAt}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          STATUS_BADGE_NEW[status] ?? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`} />
          {STATUS_LABELS[status] ?? status}
        </span>
      </td>
    </tr>
  )
}
