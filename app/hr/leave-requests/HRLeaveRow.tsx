'use client'

import { useRouter } from 'next/navigation'
import { Paperclip } from 'lucide-react'
import { HRActionButtons } from './HRActionButtons'
import { STATUS_BADGE, STATUS_DOT, STATUS_LABEL as STATUS_LABELS } from '@/lib/leave-status'

const COLOR_BADGE: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  violet: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700',
  green:  'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  amber:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  red:    'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
}

interface Props {
  id: string
  rowNumber: number
  userName: string
  departmentName: string | null
  leaveCategory: { name: string; color: string } | null
  leaveTypeName: string
  startDate: string
  endDate: string
  totalDays: string
  createdAt: string
  status: string
  documentUrl: string | null
}

export default function HRLeaveRow({
  id, rowNumber, userName, departmentName, leaveCategory, leaveTypeName,
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
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${COLOR_BADGE[leaveCategory?.color ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {leaveCategory?.name ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{leaveTypeName}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{startDate}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{endDate}</td>
      <td className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">{totalDays}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{createdAt}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`} />
          {STATUS_LABELS[status] ?? status}
        </span>
      </td>
    </tr>
  )
}
