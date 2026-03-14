'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { approveLeaveRequest, rejectLeaveRequest } from './actions'
import { formatDate } from '@/lib/format-date'

const COLOR_BADGE: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  violet: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700',
  green:  'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  amber:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  red:    'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
}

type LeaveRequest = {
  id: string
  leaveStartDateTime: Date
  leaveEndDateTime: Date
  totalDays: number
  reason: string | null
  createdAt: Date
  user: { name: string; email: string }
  leaveType: { name: string; leaveCategory: { name: string; color: string } | null }
}

function ActionButtons({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handle(action: (id: string) => Promise<{ success: boolean; message?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action(id)
      if (!result.success) setError(result.message ?? 'เกิดข้อผิดพลาด')
    })
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2 flex-nowrap justify-center">
        <button
          disabled={isPending}
          onClick={(e) => { e.stopPropagation(); handle(approveLeaveRequest) }}
          className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
        >
          {isPending ? '...' : 'อนุมัติ'}
        </button>
        <button
          disabled={isPending}
          onClick={(e) => { e.stopPropagation(); handle(rejectLeaveRequest) }}
          className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
        >
          {isPending ? '...' : 'ไม่อนุมัติ'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}

function LeaveRow({ req, rowNumber }: { req: LeaveRequest; rowNumber: number }) {
  const router = useRouter()
  const fmt = (n: number) => String(parseFloat(n.toFixed(2)))

  return (
    <tr
      onClick={() => router.push(`/leave-request/${req.id}/edit`)}
      className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors cursor-pointer"
    >
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{rowNumber}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="font-medium text-foreground">{req.user.name}</p>
        <p className="text-xs text-muted-foreground/60">{req.user.email}</p>
      </td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${COLOR_BADGE[req.leaveType.leaveCategory?.color ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {req.leaveType.leaveCategory?.name ?? '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{req.leaveType.name}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{formatDate(req.leaveStartDateTime)}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{formatDate(req.leaveEndDateTime)}</td>
      <td className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">{fmt(req.totalDays)}</td>
      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{formatDate(req.createdAt)}</td>
      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 justify-center">
          <button
            onClick={() => router.push(`/leave-request/${req.id}/edit`)}
            title="ดูรายละเอียด"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
          <ActionButtons id={req.id} />
        </div>
      </td>
    </tr>
  )
}

export default function LeaveRequestTable({ requests }: { requests: LeaveRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <p className="text-muted-foreground">ไม่มีคำขอลาที่รอการอนุมัติ</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ชื่อพนักงาน</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">หมวดหมู่</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ประเภทการลา</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันที่เริ่ม</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันที่สิ้นสุด</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">จำนวน (วัน)</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันที่ขอ</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((req, index) => (
              <LeaveRow key={req.id} req={req} rowNumber={index + 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
