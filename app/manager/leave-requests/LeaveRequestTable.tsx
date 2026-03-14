'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { approveLeaveRequest, rejectLeaveRequest } from './actions'
import { formatLeaveDuration } from '@/lib/leave-calc'
import { formatDate } from '@/lib/format-date'

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
      <div className="flex gap-2 flex-nowrap">
        <button
          disabled={isPending}
          onClick={() => handle(approveLeaveRequest)}
          className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
        >
          {isPending ? '...' : 'อนุมัติ'}
        </button>
        <button
          disabled={isPending}
          onClick={() => handle(rejectLeaveRequest)}
          className="px-3 py-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
        >
          {isPending ? '...' : 'ไม่อนุมัติ'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function LeaveRequestTable({ requests }: { requests: LeaveRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="mt-10 text-center text-muted-foreground py-16 bg-card rounded-2xl shadow-sm">
        ไม่มีคำขอลาที่รอการอนุมัติ
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl shadow-sm">
      <table className="w-full bg-card text-sm">
        <thead>
          <tr className="bg-muted/40 border-b border-border text-center text-muted-foreground font-semibold">
            <th className="px-5 py-3 whitespace-nowrap text-left">พนักงาน</th>
              <th className="px-5 py-3 whitespace-nowrap">ประเภทการลา</th>
            <th className="px-5 py-3 whitespace-nowrap">วันที่</th>
            <th className="px-5 py-3 whitespace-nowrap">จำนวน (วัน)</th>
            <th className="px-5 py-3 whitespace-nowrap">เหตุผล</th>
            <th className="px-5 py-3 whitespace-nowrap">วันที่ส่งคำขอ</th>
            <th className="px-5 py-3 whitespace-nowrap">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-muted/40 transition text-center">
              <td className="px-5 py-4 whitespace-nowrap text-left">
                <Link href={`/leave-request/${req.id}/edit`} className="font-medium text-foreground hover:text-primary hover:underline transition-colors">{req.user.name}</Link>
                <p className="text-xs text-muted-foreground/60">{req.user.email}</p>
              </td>
              <td className="px-5 py-4 text-foreground whitespace-nowrap">
                <div className="flex flex-col items-center gap-1">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                    req.leaveType.leaveCategory?.color === 'violet'
                      ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700'
                      : req.leaveType.leaveCategory?.color === 'green'
                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                  }`}>
                    {req.leaveType.leaveCategory?.name ?? '—'}
                  </span>
                  <span>{req.leaveType.name}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-foreground whitespace-nowrap">
                {formatDate(req.leaveStartDateTime)}
                {' — '}
                {formatDate(req.leaveEndDateTime)}
              </td>
              <td className="px-5 py-4 font-semibold text-foreground whitespace-nowrap">
                {formatLeaveDuration(req.totalDays).replace(' วันทำการ', '')}
              </td>
              <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">
                {req.reason || <span className="text-muted-foreground/60">—</span>}
              </td>
              <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                {formatDate(req.createdAt)}
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex justify-center items-center gap-2">
                  <Link
                    href={`/leave-request/${req.id}/edit`}
                    title="ดูรายละเอียด"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <ActionButtons id={req.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
