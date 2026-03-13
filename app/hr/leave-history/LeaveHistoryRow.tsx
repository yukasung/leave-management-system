'use client'

import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  DRAFT:            'ร่าง',
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'รอ HR',
  APPROVED:         'อนุมัติแล้ว',
  REJECTED:         'ปฏิเสธ',
  CANCELLED:        'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW:        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:         'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:         'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  CANCELLED:        'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
  CANCEL_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
  DRAFT:            'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
}

const STATUS_DOT: Record<string, string> = {
  PENDING:          'bg-amber-500',
  IN_REVIEW:        'bg-blue-500',
  APPROVED:         'bg-emerald-500',
  REJECTED:         'bg-red-500',
  CANCELLED:        'bg-gray-400',
  CANCEL_REQUESTED: 'bg-orange-500',
  DRAFT:            'bg-gray-400',
}

type Props = {
  id: string
  rowNumber: number
  employeeCode: string | null
  userName: string
  departmentName: string | null
  leaveTypeName: string
  startDate: string
  endDate: string
  totalDays: string
  status: string
  createdAt: string
  reason: string | null
  approverName: string | null
}

export default function LeaveHistoryRow({
  id,
  rowNumber,
  employeeCode,
  userName,
  departmentName,
  leaveTypeName,
  startDate,
  endDate,
  totalDays,
  status,
  createdAt,
  reason,
  approverName,
}: Props) {
  return (
    <tr className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
      <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">{rowNumber}</td>
      <td className="px-3 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
        {employeeCode ?? <span className="italic opacity-40">—</span>}
      </td>
      <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{userName}</td>
      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">
        {departmentName ?? <span className="italic opacity-40">—</span>}
      </td>
      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">{leaveTypeName}</td>
      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">{startDate}</td>
      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">{endDate}</td>
      <td className="px-3 py-3 text-center font-semibold text-foreground whitespace-nowrap">{totalDays}</td>
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
          STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600 border-gray-200',
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status] ?? 'bg-gray-400')} />
          {STATUS_LABELS[status] ?? status}
        </span>
      </td>
      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap text-xs">{createdAt}</td>
      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
        {reason ? (
          <span className="text-xs">{reason}</span>
        ) : (
          <span className="italic opacity-40 text-xs block text-center">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-left text-muted-foreground whitespace-nowrap">
        {approverName ?? <span className="italic opacity-40 text-xs">—</span>}
      </td>
    </tr>
  )
}
