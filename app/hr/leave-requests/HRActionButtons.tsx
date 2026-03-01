'use client'

import { useTransition } from 'react'
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/manager/leave-requests/actions'

export function HRActionButtons({ id }: { id: string }) {
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
