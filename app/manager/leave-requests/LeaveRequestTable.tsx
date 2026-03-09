'use client'

import { useState, useTransition } from 'react'
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
  leaveType: { name: string }
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
      <div className="flex gap-2">
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
          <tr className="bg-muted/40 border-b border-border text-left text-muted-foreground font-semibold">
            <th className="px-5 py-3">พนักงาน</th>
            <th className="px-5 py-3">ประเภทการลา</th>
            <th className="px-5 py-3">วันที่</th>
            <th className="px-5 py-3 text-center">จำนวน</th>
            <th className="px-5 py-3">เหตุผล</th>
            <th className="px-5 py-3">วันที่ส่งคำขอ</th>
            <th className="px-5 py-3">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-muted/40 transition">
              <td className="px-5 py-4">
                <p className="font-medium text-foreground">{req.user.name}</p>
                <p className="text-xs text-muted-foreground/60">{req.user.email}</p>
              </td>
              <td className="px-5 py-4 text-foreground">{req.leaveType.name}</td>
              <td className="px-5 py-4 text-foreground whitespace-nowrap">
                {formatDate(req.leaveStartDateTime)}
                {' — '}
                {formatDate(req.leaveEndDateTime)}
              </td>
              <td className="px-5 py-4 text-center font-semibold text-foreground">
                {formatLeaveDuration(req.totalDays)}
              </td>
              <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">
                {req.reason || <span className="text-muted-foreground/60">—</span>}
              </td>
              <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                {formatDate(req.createdAt)}
              </td>
              <td className="px-5 py-4">
                <ActionButtons id={req.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
