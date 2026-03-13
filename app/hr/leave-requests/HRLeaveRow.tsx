'use client'

import { useRouter } from 'next/navigation'
import { Paperclip } from 'lucide-react'
import { HRActionButtons } from './HRActionButtons'
import { STATUS_BADGE, STATUS_DOT, STATUS_LABEL as STATUS_LABELS } from '@/lib/leave-status'

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
          STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`} />
          {STATUS_LABELS[status] ?? status}
        </span>
      </td>
    </tr>
  )
}
