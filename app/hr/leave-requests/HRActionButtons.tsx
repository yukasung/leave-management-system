'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/manager/leave-requests/actions'
import { hrApproveCancellation, hrAdminCancelApproved } from './actions'

export function HRActionButtons({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handle(action: (id: string) => Promise<{ success: boolean; message?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action(id)
      if (result.success) {
        setDone(true)
        router.refresh()
      } else {
        setError(result.message ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  if (done) return null

  // APPROVED: admin can force-cancel
  if (status === 'APPROVED') {
    return (
      <div className="space-y-1">
        <div className="flex gap-2 whitespace-nowrap">
          <button
            disabled={isPending}
            onClick={() => handle(hrAdminCancelApproved)}
            className="px-3 py-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
          >
            {isPending ? '...' : 'ยกเลิก'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  // CANCEL_REQUESTED: approve the cancellation only
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
