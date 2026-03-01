'use client'

import { useTransition } from 'react'
import { approveLeaveRequest, rejectLeaveRequest } from './actions'

type LeaveRequest = {
  id: string
  startDate: Date
  endDate: Date
  totalDays: number
  reason: string | null
  createdAt: Date
  user: { name: string; email: string }
  leaveType: { name: string }
}

function ActionButtons({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => startTransition(() => approveLeaveRequest(id))}
        className="px-3 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
      >
        {isPending ? '...' : 'อนุมัติ'}
      </button>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => rejectLeaveRequest(id))}
        className="px-3 py-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
      >
        {isPending ? '...' : 'ไม่อนุมัติ'}
      </button>
    </div>
  )
}

export default function LeaveRequestTable({ requests }: { requests: LeaveRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="mt-10 text-center text-gray-500 py-16 bg-white rounded-2xl shadow-sm">
        ไม่มีคำขอลาที่รอการอนุมัติ
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl shadow-sm">
      <table className="w-full bg-white text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 font-semibold">
            <th className="px-5 py-3">พนักงาน</th>
            <th className="px-5 py-3">ประเภทการลา</th>
            <th className="px-5 py-3">วันที่</th>
            <th className="px-5 py-3 text-center">จำนวน</th>
            <th className="px-5 py-3">เหตุผล</th>
            <th className="px-5 py-3">วันที่ส่งคำขอ</th>
            <th className="px-5 py-3">การดำเนินการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-gray-50 transition">
              <td className="px-5 py-4">
                <p className="font-medium text-gray-900">{req.user.name}</p>
                <p className="text-xs text-gray-400">{req.user.email}</p>
              </td>
              <td className="px-5 py-4 text-gray-700">{req.leaveType.name}</td>
              <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                {req.startDate.toLocaleDateString('th-TH')}
                {' — '}
                {req.endDate.toLocaleDateString('th-TH')}
              </td>
              <td className="px-5 py-4 text-center font-semibold text-gray-900">
                {req.totalDays} วัน
              </td>
              <td className="px-5 py-4 text-gray-600 max-w-xs truncate">
                {req.reason || <span className="text-gray-400">—</span>}
              </td>
              <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                {req.createdAt.toLocaleDateString('th-TH')}
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
