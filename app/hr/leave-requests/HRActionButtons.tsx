'use client'

import { useState, useTransition } from 'react'
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/manager/leave-requests/actions'
import { hrApproveCancellation, hrRejectCancellation } from './actions'

export function HRActionButtons({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handle(action: (id: string) => Promise<{ success: boolean; message?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action(id)
      if (!result.success) setError(result.message ?? 'เกิดข้อผิดพลาด')
    })
  }

  // CANCEL_REQUESTED: approve or reject the cancellation
  if (status === 'CANCEL_REQUESTED') {
    return (
      <div className="space-y-1">
        <div className="flex gap-2 whitespace-nowrap">
          <button
            disabled={isPending}
            onClick={() => handle(hrApproveCancellation)}
            className="px-3 py-1.5 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-50"
          >
            {isPending ? '...' : 'อนุมัติยกเลิก'}
          </button>
          <button
            disabled={isPending}
            onClick={() => handle(hrRejectCancellation)}
            className="px-3 py-1.5 text-sm font-medium bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
          >
            {isPending ? '...' : 'ปฏิเสธยกเลิก'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  // PENDING / IN_REVIEW: approve or reject the leave
  return (
    <div className="space-y-1">
      <div className="flex gap-2 whitespace-nowrap">
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
