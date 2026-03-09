import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/lib/button-variants'
import { formatThaiDateShort } from '@/lib/date-utils'
import { cn } from '@/lib/utils'

export type LeaveRow = {
  id: string
  employee: { name: string; avatarUrl?: string | null }
  leaveType: string
  leaveStartDateTime: Date
  leaveEndDateTime: Date
  totalDays: number
  status: string
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'ร่าง',
  PENDING:   'รออนุมัติ',
  IN_REVIEW: 'กำลังพิจารณา',
  APPROVED:  'อนุมัติแล้ว',
  REJECTED:  'ไม่อนุมัติ',
  CANCELLED: 'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก',
}

const STATUS_CLASS: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700/50',
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/50',
}

const STATUS_DOT: Record<string, string> = {
  DRAFT:     'bg-slate-400',
  PENDING:   'bg-amber-500',
  IN_REVIEW: 'bg-blue-500',
  APPROVED:  'bg-emerald-500',
  REJECTED:  'bg-red-500',
  CANCELLED: 'bg-gray-400',
}

export function LeaveTable({
  rows,
  showActions = true,
}: {
  rows: LeaveRow[]
  showActions?: boolean
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">ไม่มีคำขอลา</p>
        <p className="mt-1 text-xs text-muted-foreground">ไม่มีข้อมูลตรงกับตัวกรองปัจจุบัน</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              พนักงาน
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ประเภทการลา
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              วันที่เริ่ม
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              วันที่สิ้นสุด
            </TableHead>
            <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              จำนวนวัน
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              สถานะ
            </TableHead>
            {showActions && (
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                จัดการ
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
              {/* Employee */}
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {row.employee.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {row.employee.name}
                  </span>
                </div>
              </TableCell>
              {/* Leave Type */}
              <TableCell className="text-sm text-muted-foreground">
                {row.leaveType}
              </TableCell>
              {/* Start Date */}
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatThaiDateShort(new Date(row.leaveStartDateTime))}
              </TableCell>
              {/* End Date */}
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatThaiDateShort(new Date(row.leaveEndDateTime))}
              </TableCell>
              {/* Days */}
              <TableCell className="text-center text-sm font-medium text-foreground">
                {row.totalDays}
              </TableCell>
              {/* Status */}
              <TableCell>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    STATUS_CLASS[row.status] ?? 'bg-gray-100 text-gray-600 border-gray-200',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[row.status] ?? 'bg-gray-400')} />
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </TableCell>
              {/* Actions */}
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/hr/leave-requests?highlight=${row.id}`}
                      className={buttonVariants({ variant: 'ghost', size: 'xs' })}
                    >
                      ดู
                    </Link>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
